import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { bookingMutex } from '../utils/mutex';
import { getOfficeLocalTime, isSlotInPastOrTooSoon } from '../utils/timezone';
import { notificationService } from '../services/notificationService';
import { ensureUserProfileExists } from '../utils/profileHelper';
import { normalizeCounterCode } from './adminController';

export const generateToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      serviceId,
      serviceName,
      officeId,
      applicationId,
      timeSlot,
      slotDate,
      selectedState,
      selectedCity,
      documents,
    } = req.body;

    if (!userId || !serviceId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Authentication and serviceId are required.' },
      });
      return;
    }

    // Ensure user profile exists in database before generating token
    await ensureUserProfileExists(userId, req.user);

    // Resolve valid service UUID if needed
    let resolvedServiceId = serviceId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
    if (!isUuid) {
      const { data: matchedSvc } = await supabaseAdmin
        .from('services')
        .select('id')
        .or(`name.ilike.%${serviceName || ''}%,code.ilike.%${serviceId}%`)
        .limit(1)
        .maybeSingle();

      if (matchedSvc) {
        resolvedServiceId = matchedSvc.id;
      } else {
        const { data: firstSvc } = await supabaseAdmin.from('services').select('id').limit(1).single();
        if (firstSvc) resolvedServiceId = firstSvc.id;
      }
    }

    // Resolve valid office UUID
    let resolvedOfficeId = officeId;
    const isOfficeUuid = officeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeId);
    if (!isOfficeUuid) {
      const { data: firstOffice } = await supabaseAdmin.from('offices').select('id').limit(1).single();
      if (firstOffice) resolvedOfficeId = firstOffice.id;
    }

    const { localDateStr } = getOfficeLocalTime();
    const bookingDate = slotDate || localDateStr;

    // Requirement 1: Protect booking creation per slot AND per user with keyed mutex
    const slotLockKey = `slot_${resolvedServiceId}_${bookingDate}_${timeSlot || 'WALKIN'}`;
    const userLockKey = `user_queue_${userId}`;

    await bookingMutex.runExclusive(userLockKey, async () => {
      await bookingMutex.runExclusive(slotLockKey, async () => {
        // Requirement 19: Reject past date restriction
        if (bookingDate < localDateStr) {
          res.status(400).json({
            success: false,
            error: { code: 'PAST_DATE', message: 'Tokens cannot be booked for past dates.' },
          });
          return;
        }

        // Requirement 13: National & State Holiday Closure Check
        const { isOfficeClosedOnDate } = await import('./holidayController');
        const holidayClosure = await isOfficeClosedOnDate(bookingDate, selectedState, resolvedOfficeId);
        if (holidayClosure.isClosed && holidayClosure.holiday) {
          res.status(400).json({
            success: false,
            error: {
              code: 'OFFICE_CLOSED_HOLIDAY',
              message: `Government office is officially closed on ${bookingDate} for ${holidayClosure.holiday.name}. Token bookings cannot be issued on official holidays.`,
            },
          });
          return;
        }

        // Fetch service configuration for slot capacity & stopped dates
        const { data: serviceConfig } = await supabaseAdmin
          .from('services')
          .select('stopped_booking_dates, is_booking_stopped, start_time, end_time, slot_duration_minutes, avg_processing_time_minutes, slot_capacity')
          .eq('id', resolvedServiceId)
          .maybeSingle();

        // Requirement 24: Stopped Booking Check for target date (both services table and service_stop_bookings table)
        if (serviceConfig) {
          const isStoppedInService =
            (serviceConfig.stopped_booking_dates && serviceConfig.stopped_booking_dates.includes(bookingDate)) ||
            (bookingDate === localDateStr && serviceConfig.is_booking_stopped);

          if (isStoppedInService) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BOOKING_STOPPED',
                message: `Online bookings for this service are stopped for ${bookingDate} due to heavy counter crowd. Please visit the offline counter for walk-in token issuance.`,
              },
            });
            return;
          }

          try {
            const { data: stopRow } = await supabaseAdmin
              .from('service_stop_bookings')
              .select('id')
              .eq('service_id', resolvedServiceId)
              .eq('stop_date', bookingDate)
              .maybeSingle();

            if (stopRow) {
              res.status(400).json({
                success: false,
                error: {
                  code: 'BOOKING_STOPPED',
                  message: `Online bookings for this service are stopped for ${bookingDate} by counter administration.`,
                },
              });
              return;
            }
          } catch {
            // Ignore if table not created yet
          }
        }

        // Requirement 19 & 20: 30-Minute Advance Booking Rule & Past Slot Rejection
        if (timeSlot) {
          const slotCheck = isSlotInPastOrTooSoon(bookingDate, timeSlot, 30);
          if (slotCheck.isPastOrTooSoon) {
            res.status(400).json({
              success: false,
              error: {
                code: 'SLOT_EXPIRED_OR_TOO_SOON',
                message: slotCheck.reason || 'Tokens must be booked at least 30 minutes in advance of slot start time (slot_start_time >= current_time + 30 minutes).',
              },
            });
            return;
          }
        }

        // Requirement 22: Online Booking Capacity Limit
        if (timeSlot && serviceConfig) {
          const duration = serviceConfig.slot_duration_minutes || 30;
          const procTime = serviceConfig.avg_processing_time_minutes || 5;
          const theoreticalCap = Math.floor(duration / procTime);
          const onlineCap = Math.floor(theoreticalCap / 2);
          const maxCapacity = Math.max(1, serviceConfig.slot_capacity || onlineCap);

          const { count: currentSlotBookings } = await supabaseAdmin
            .from('queue_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('service_id', resolvedServiceId)
            .or(`slot_date.eq.${bookingDate},queue_date.eq.${bookingDate}`)
            .eq('time_slot', timeSlot)
            .not('status', 'in', '("CANCELLED","MISSED","SKIPPED","REJECTED","EXPIRED")');

          if ((currentSlotBookings || 0) >= maxCapacity) {
            res.status(400).json({
              success: false,
              error: {
                code: 'SLOT_FULL',
                message: `Time slot ${timeSlot} has reached maximum online capacity (${maxCapacity} bookings). Please select another slot.`,
              },
            });
            return;
          }
        }

        // Requirement 1: ACTIVE QUEUE RESTRICTION
        // A user CANNOT book another service while they have an active service queue anywhere in the system.
        // Active statuses: WAITING, CALLED, IN_SERVICE, PROCESSING, TRANSFER_PENDING, TRANSFERRED.
        // Terminal/Completed statuses (COMPLETED, CANCELLED, MISSED, SKIPPED, NO_SHOW, REJECTED, EXPIRED) allow booking another service!
        const ACTIVE_QUEUE_STATUSES = ['WAITING', 'CALLED', 'IN_SERVICE', 'PROCESSING', 'TRANSFER_PENDING', 'TRANSFERRED'];

        const { data: activeQueueToken } = await supabaseAdmin
          .from('queue_tokens')
          .select('id, token_number, status, counter_number, service_id, services(name)')
          .eq('user_id', userId)
          .in('status', ACTIVE_QUEUE_STATUSES)
          .limit(1)
          .maybeSingle();

        if (activeQueueToken) {
          const activeSvc = (activeQueueToken.services as any)?.name || 'Government Service';
          res.status(400).json({
            success: false,
            error: {
              code: 'ACTIVE_QUEUE_EXISTS',
              message: `You currently have an active service queue (Token ${activeQueueToken.token_number} for ${activeSvc} at ${activeQueueToken.counter_number || 'Counter'} - Status: ${activeQueueToken.status}). You cannot book another service until your current service queue is completed.`,
            },
          });
          return;
        }

        // Prevent booking the exact same time slot twice if active
        if (timeSlot) {
          const { data: duplicateSlot } = await supabaseAdmin
            .from('queue_tokens')
            .select('id, token_number, status')
            .eq('user_id', userId)
            .eq('service_id', resolvedServiceId)
            .or(`slot_date.eq.${bookingDate},queue_date.eq.${bookingDate}`)
            .eq('time_slot', timeSlot)
            .in('status', ACTIVE_QUEUE_STATUSES)
            .limit(1)
            .maybeSingle();

          if (duplicateSlot) {
            res.status(400).json({
              success: false,
              error: {
                code: 'DUPLICATE_SLOT_BOOKING',
                message: `You already hold an active booking (Token ${duplicateSlot.token_number}) for this exact time slot (${timeSlot}).`,
              },
            });
            return;
          }
        }

      const { count: waitingCount } = await supabaseAdmin
        .from('queue_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'WAITING');

    const totalWaiting = waitingCount || 0;
    const tokenNumber = `A${100 + totalWaiting + 1}`;

    // Automatically create Application record with submitted documents so employee sees it in Citizen Inbox
    let finalAppId = applicationId;
    if (!finalAppId) {
      try {
        const appNum = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
        const { data: newApp } = await supabaseAdmin
          .from('applications')
          .insert({
            application_number: appNum,
            user_id: userId,
            service_id: resolvedServiceId,
            office_id: resolvedOfficeId,
            status: 'SUBMITTED',
            remarks: `Online booking for ${timeSlot || 'General Virtual Queue'}`,
          })
          .select('id')
          .maybeSingle();

        if (newApp) {
          finalAppId = newApp.id;

          if (Array.isArray(documents) && documents.length > 0) {
            for (const doc of documents) {
              await supabaseAdmin.from('documents').insert({
                application_id: newApp.id,
                user_id: userId,
                requirement_name: doc.requirementName || doc.name || 'Submitted Document',
                storage_path: doc.fileUrl || `https://storage.nagrikq.gov.in/docs/${(doc.name || 'document').toLowerCase().replace(/\s+/g, '_')}.pdf`,
                file_name: doc.fileName || `${(doc.name || 'document').toLowerCase().replace(/\s+/g, '_')}.pdf`,
                verification_status: 'PENDING',
              });
            }
          } else {
            // Dynamically populate documents configured for this service
            const { data: reqDocs } = await supabaseAdmin
              .from('document_requirements')
              .select('*')
              .eq('service_id', resolvedServiceId);

            if (reqDocs && reqDocs.length > 0) {
              for (const reqDoc of reqDocs) {
                await supabaseAdmin.from('documents').insert({
                  application_id: newApp.id,
                  user_id: userId,
                  document_requirement_id: reqDoc.id,
                  requirement_name: reqDoc.name,
                  storage_path: `https://storage.nagrikq.gov.in/docs/${reqDoc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                  file_name: `${reqDoc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                  verification_status: 'PENDING',
                });
              }
            }
          }
        }
      } catch (appErr) {
        console.warn('Auto application create note:', appErr);
      }
    }

    // Resolve initial counter from configured service counter path or active assigned employees
    let initialCounter = 'C-01';
    if (Array.isArray(req.body.counterPath) && req.body.counterPath.length > 0) {
      const firstStep = String(req.body.counterPath[0]);
      const match = firstStep.match(/C-?0*(\d+)/i) || firstStep.match(/Counter\s*0*(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        initialCounter = num < 10 ? `C-0${num}` : `C-${num}`;
      }
    }

    try {
      const { data: activeStaff } = await supabaseAdmin
        .from('staff_profiles')
        .select('counter_number')
        .eq('role', 'employee')
        .eq('status', 'ACTIVE')
        .not('counter_number', 'is', null);

      if (activeStaff && activeStaff.length > 0) {
        const activeCounters = activeStaff
          .map((s) => normalizeCounterCode(s.counter_number))
          .filter(Boolean) as string[];
        activeCounters.sort();
        // If the default initial counter does not have an active employee assigned, route to the lowest active employee counter
        if (activeCounters.length > 0 && !activeCounters.includes(initialCounter)) {
          initialCounter = activeCounters[0];
        }
      }
    } catch {
      // Fallback to initialCounter
    }

    const basePayload: any = {
      token_number: tokenNumber,
      user_id: userId,
      service_id: resolvedServiceId,
      office_id: resolvedOfficeId,
      application_id: finalAppId || null,
      counter_number: initialCounter,
      status: 'WAITING',
      position: totalWaiting + 1,
      people_ahead: totalWaiting,
      estimated_wait_minutes: Math.max(5, totalWaiting * 5),
    };

    const extendedPayload = {
      ...basePayload,
      time_slot: timeSlot || null,
      slot_date: slotDate || new Date().toISOString().split('T')[0],
      selected_state: selectedState || 'Gujarat',
      selected_city: selectedCity || 'Rajkot',
      counter_path: Array.isArray(req.body.counterPath) ? req.body.counterPath : null,
      current_counter_index: 0,
      grace_period_minutes: 15,
      submitted_documents: documents || null,
    };

    // First attempt insert with all extended scheduling columns
    let tokenResult = await supabaseAdmin
      .from('queue_tokens')
      .insert(extendedPayload)
      .select('*, services(id, name, code, category), offices(id, name)')
      .maybeSingle();

    // If column doesn't exist yet (42703), retry insert with base payload
    if (tokenResult.error && tokenResult.error.code === '42703') {
      tokenResult = await supabaseAdmin
        .from('queue_tokens')
        .insert(basePayload)
        .select('*, services(id, name, code, category), offices(id, name)')
        .maybeSingle();
    }

    const { data: token, error } = tokenResult;

    if (error || !token) {
      console.error('[GENERATE_TOKEN_ERROR]', error);
      res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: error?.message || 'Failed to issue token.' } });
      return;
    }

    // Ensure returned token carries the actual booked slot & metadata
    const finalTokenData = {
      ...token,
      time_slot: token.time_slot || timeSlot || null,
      slot_date: token.slot_date || slotDate || new Date().toISOString().split('T')[0],
      selected_state: token.selected_state || selectedState || 'Gujarat',
      selected_city: token.selected_city || selectedCity || 'Rajkot',
      counter_path: token.counter_path || req.body.counterPath || null,
      counter_number: token.counter_number || initialCounter,
    };

    // Requirement 1: Service Booking Notification
    const resolvedSvcName = token.services?.name || serviceName || 'Government Service';
    const resolvedTokenNum = token.token_number || tokenNumber;
    await notificationService.sendQueuePushNotification({
      userId,
      tokenId: token.id,
      tokenNumber: resolvedTokenNum,
      serviceName: resolvedSvcName,
      counterNumber: finalTokenData.counter_number,
      eventType: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      body: `Your booking for ${resolvedSvcName} is confirmed. Your token number is ${resolvedTokenNum}.`,
      metadata: {
        timeSlot: finalTokenData.time_slot || '',
        slotDate: finalTokenData.slot_date || '',
        officeName: token.offices?.name || 'Jan Seva Kendra',
      },
    });

    res.status(201).json({ success: true, data: finalTokenData } as ApiResponse);
      });
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getLiveQueue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, data: null } as ApiResponse);
      return;
    }

    let { data: token } = await supabaseAdmin
      .from('queue_tokens')
      .select('*, services(id, name, code, category), offices(id, name), applications(id, remarks)')
      .eq('user_id', userId)
      .in('status', ['WAITING', 'CALLED', 'IN_SERVICE'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If no active WAITING/CALLED/IN_SERVICE token, check for a recently completed token with a next destination table
    if (!token) {
      try {
        const { data: directedToken } = await supabaseAdmin
          .from('queue_tokens')
          .select('*, services(id, name, code, category), offices(id, name), applications(id, remarks)')
          .eq('user_id', userId)
          .eq('status', 'COMPLETED')
          .not('next_counter', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (directedToken) {
          token = directedToken;
        }
      } catch {
        // Fallback if column not present yet
      }
    }

    if (token) {
      if (!token.time_slot && token.applications?.remarks) {
        const remarks = String(token.applications.remarks);
        if (remarks.includes('Online booking for ')) {
          const slotMatch = remarks.replace('Online booking for ', '').trim();
          if (slotMatch.includes('-')) {
            token.time_slot = slotMatch;
          }
        }
      }
    }

    res.json({ success: true, data: token || null } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMyTokens = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    const { data: tokens, error } = await supabaseAdmin
      .from('queue_tokens')
      .select('*, services(id, name, code, category), offices(id, name), applications(id, remarks)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[GET_MY_TOKENS_WARN]', error);
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    const formatted = (tokens || []).map((t: any) => {
      let resolvedSlot = t.time_slot;
      if (!resolvedSlot && t.applications?.remarks) {
        const remarks = String(t.applications.remarks);
        if (remarks.includes('Online booking for ')) {
          const match = remarks.replace('Online booking for ', '').trim();
          if (match.includes('-')) resolvedSlot = match;
        }
      }
      return {
        ...t,
        time_slot: resolvedSlot || t.time_slot,
      };
    });

    res.json({ success: true, data: formatted } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getOfficerQueueTokens = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { serviceIds, counterNumber, status } = req.query;

    let query = supabaseAdmin
      .from('queue_tokens')
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .order('created_at', { ascending: true });

    // Fix 8: Employee Service Eligibility filtering
    let eligibleServiceIds: string[] | null = null;
    if (req.user?.role === 'employee' && req.user?.id) {
      const { data: officerRec } = await supabaseAdmin
        .from('officers')
        .select('assigned_service_ids')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (Array.isArray(officerRec?.assigned_service_ids) && officerRec.assigned_service_ids.length > 0) {
        eligibleServiceIds = officerRec.assigned_service_ids;
      } else {
        const { data: staffRec } = await supabaseAdmin
          .from('staff_profiles')
          .select('assigned_service_ids')
          .eq('id', req.user.id)
          .maybeSingle();
        if (Array.isArray(staffRec?.assigned_service_ids) && staffRec.assigned_service_ids.length > 0) {
          eligibleServiceIds = staffRec.assigned_service_ids;
        }
      }
    }

    let finalServiceFilter: string[] | null = null;
    if (serviceIds && typeof serviceIds === 'string') {
      const requestedIds = serviceIds.split(',').filter(Boolean);
      if (eligibleServiceIds !== null) {
        finalServiceFilter = requestedIds.filter((id) => eligibleServiceIds!.includes(id));
      } else {
        finalServiceFilter = requestedIds;
      }
    } else if (eligibleServiceIds !== null) {
      finalServiceFilter = eligibleServiceIds;
    }

    if (finalServiceFilter !== null) {
      if (finalServiceFilter.length === 0) {
        res.json({ success: true, data: [] } as ApiResponse);
        return;
      }
      query = query.in('service_id', finalServiceFilter);
    }

    if (counterNumber && typeof counterNumber === 'string') {
      query = query.eq('counter_number', counterNumber);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: tokens, error } = await query;

    if (error || !tokens) {
      console.warn('[GET_OFFICER_TOKENS_WARN]', error);
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    res.json({ success: true, data: tokens } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const callNextToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { counterNumber, serviceIds } = req.body;
    const normalizedCounter = normalizeCounterCode(counterNumber) || counterNumber || 'C-01';
    const targetCounter = normalizedCounter;

    // 1. If officer already has an IN_SERVICE citizen at this counter, complete it
    await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('counter_number', [targetCounter, counterNumber].filter(Boolean))
      .eq('status', 'IN_SERVICE');

    // 1B. Check if officer is currently on break time
    const userId = req.user?.id;
    if (userId) {
      const { data: staff } = await supabaseAdmin
        .from('staff_profiles')
        .select('break_start_time, break_end_time, on_break')
        .eq('id', userId)
        .maybeSingle();

      if (staff?.on_break) {
        res.status(400).json({
          success: false,
          error: { code: 'OFFICER_ON_BREAK', message: 'You are currently on break. New citizens cannot be called until break concludes.' },
        });
        return;
      }

      if (staff?.break_start_time && staff?.break_end_time) {
        const parseTimeToMinutes = (tStr: string): number | null => {
          if (!tStr) return null;
          const match = tStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
          if (!match) return null;
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const meridiem = match[3]?.toUpperCase();
          if (meridiem === 'PM' && h < 12) h += 12;
          if (meridiem === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const startMins = parseTimeToMinutes(staff.break_start_time);
        const endMins = parseTimeToMinutes(staff.break_end_time);

        if (startMins !== null && endMins !== null && currentMins >= startMins && currentMins <= endMins) {
          res.status(400).json({
            success: false,
            error: { code: 'OFFICER_ON_BREAK', message: `Counter is on scheduled break (${staff.break_start_time} - ${staff.break_end_time}). New citizens will not be assigned.` },
          });
          return;
        }
      }
    }

    // 2. Query for next waiting citizen matching officer's assigned services and counter
    let effectiveServiceIds: string[] = Array.isArray(serviceIds) ? serviceIds : [];
    if (req.user?.role === 'employee' && req.user?.id) {
      let assigned: string[] | null = null;
      const { data: staffRec } = await supabaseAdmin
        .from('staff_profiles')
        .select('assigned_service_ids')
        .eq('id', req.user.id)
        .maybeSingle();

      if (Array.isArray(staffRec?.assigned_service_ids) && staffRec.assigned_service_ids.length > 0) {
        assigned = staffRec.assigned_service_ids;
      } else {
        const { data: officerRec } = await supabaseAdmin
          .from('officers')
          .select('assigned_service_ids')
          .eq('user_id', req.user.id)
          .maybeSingle();
        if (Array.isArray(officerRec?.assigned_service_ids) && officerRec.assigned_service_ids.length > 0) {
          assigned = officerRec.assigned_service_ids;
        }
      }

      if (Array.isArray(assigned) && assigned.length > 0) {
        if (effectiveServiceIds.length > 0) {
          effectiveServiceIds = effectiveServiceIds.filter((id) => assigned.includes(id));
        } else {
          effectiveServiceIds = assigned;
        }
      }
    }

    const counterNumMatch = String(targetCounter).match(/\d+/);
    const counterNum = counterNumMatch ? parseInt(counterNumMatch[0], 10) : 1;
    const counterVariants = Array.from(new Set([
      targetCounter,
      counterNumber,
      `C-${counterNum}`,
      `C-0${counterNum}`,
      `${counterNum}`,
      `Counter ${counterNum}`,
      `Counter 0${counterNum}`,
    ].filter(Boolean)));

    // Check active assigned employee counters from staff_profiles
    const { data: activeStaffList } = await supabaseAdmin
      .from('staff_profiles')
      .select('counter_number')
      .eq('role', 'employee')
      .eq('status', 'ACTIVE')
      .not('counter_number', 'is', null);

    const activeCounters = (activeStaffList || [])
      .map((s) => normalizeCounterCode(s.counter_number))
      .filter(Boolean) as string[];
    activeCounters.sort();

    const isC01Staffed = activeCounters.includes('C-01');
    const isLowestStaffedCounter =
      activeCounters.length === 0 ||
      activeCounters[0] === targetCounter ||
      (!isC01Staffed && activeCounters[0] === targetCounter);

    let query = supabaseAdmin
      .from('queue_tokens')
      .select('id, token_number, user_id, service_id, status, counter_number')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true });

    if (effectiveServiceIds.length > 0) {
      query = query.in('service_id', effectiveServiceIds);
    }

    const { data: waitingList, error: findError } = await query.limit(50);

    // 1. Priority 1: Token specifically waiting for / routed to this counter
    let targetToken = (waitingList || []).find((t) => {
      const c = t.counter_number;
      if (!c) return false;
      return counterVariants.some((v) => v.toLowerCase() === String(c).trim().toLowerCase());
    });

    // 2. Priority 2: If no token explicitly at this counter, and this counter is the lowest staffed desk (or C-01 is unstaffed),
    // pick unassigned / initial C-01 tokens so citizens are served immediately!
    if (!targetToken && isLowestStaffedCounter) {
      targetToken = (waitingList || []).find((t) => {
        const c = t.counter_number;
        if (!c || c === 'Unassigned') return true;
        if (!isC01Staffed && (c === 'C-01' || c === 'C-1' || c === '1')) return true;
        return false;
      });
    }

    if (findError || !targetToken) {
      res.json({
        success: true,
        data: null,
        message: 'No citizens currently waiting for your assigned services.',
      } as ApiResponse);
      return;
    }

    // 3. Mark token as IN_SERVICE for this counter
    const { data: updatedToken, error: updateError } = await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'IN_SERVICE',
        counter_number: targetCounter,
        called_at: new Date().toISOString(),
        service_started_at: new Date().toISOString(),
        people_ahead: 0,
        estimated_wait_minutes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetToken.id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (updateError || !updatedToken) {
      res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: updateError?.message || 'Failed to call token.' } });
      return;
    }

    // 4. Update people ahead & wait time for remaining waiting tokens
    const { data: remainingWaiting } = await supabaseAdmin
      .from('queue_tokens')
      .select('id')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true });

    if (remainingWaiting && remainingWaiting.length > 0) {
      for (let i = 0; i < remainingWaiting.length; i++) {
        await supabaseAdmin
          .from('queue_tokens')
          .update({
            people_ahead: i,
            estimated_wait_minutes: i * 5,
          })
          .eq('id', remainingWaiting[i].id);
      }
    }

    // 5. Log audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: req.user?.id,
      actor_user_name: req.user?.fullName || 'Officer',
      actor_user_role: req.user?.role || 'employee',
      action: 'CALL_NEXT_QUEUE',
      entity_type: 'queue_token',
      entity_id: updatedToken.id,
      details: `Officer called next citizen ${updatedToken.token_number} to counter ${targetCounter}.`,
    });

    // Requirement 6: Token Called Notification
    if (updatedToken.user_id) {
      const tokenNum = updatedToken.token_number || 'Token';
      const svcName = updatedToken.services?.name || 'Service';
      await notificationService.sendQueuePushNotification({
        userId: updatedToken.user_id,
        tokenId: updatedToken.id,
        tokenNumber: tokenNum,
        serviceName: svcName,
        counterNumber: targetCounter,
        eventType: 'TOKEN_CALLED',
        title: 'Token Called',
        body: `Your token ${tokenNum} has been called. Please proceed to ${targetCounter}.`,
      });
    }

    res.json({ success: true, data: updatedToken } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateTokenStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, nextCounter } = req.body;

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    }

    if (nextCounter) {
      updates.next_counter = nextCounter;
    }

    let updateRes = await supabaseAdmin
      .from('queue_tokens')
      .update(updates)
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    // Graceful fallback if column does not exist yet (error 42703)
    if (updateRes.error && updateRes.error.code === '42703') {
      delete updates.next_counter;
      updateRes = await supabaseAdmin
        .from('queue_tokens')
        .update(updates)
        .eq('id', id)
        .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
        .single();
    }

    const { data: token, error } = updateRes;

    if (error) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } });
      return;
    }

    // Sync linked application status upon genuine service completion
    if (status === 'COMPLETED' && token?.application_id) {
      try {
        await supabaseAdmin
          .from('applications')
          .update({
            status: 'APPROVED',
            remarks: 'Service completed successfully at counter desk.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', token.application_id);
      } catch (appUpdateErr) {
        console.warn('Update linked app on complete warning:', appUpdateErr);
      }
    }

    if (token && nextCounter) {
      token.next_counter = token.next_counter || nextCounter;
    }

    // Trigger relevant Push Notifications based on state change
    if (token && token.user_id) {
      const tokenNum = token.token_number || 'Token';
      const svcName = token.services?.name || 'Government Service';
      const counterNum = token.counter_number || 'Counter';

      if (nextCounter) {
        // Section 2: Table Redirection
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          nextCounter,
          eventType: 'TABLE_REDIRECTED',
          title: 'Please Proceed to Another Counter',
          body: `Your token ${tokenNum} has been redirected to ${nextCounter}. Please proceed to the assigned counter.`,
        });
      } else if (status === 'IN_SERVICE') {
        // Section 3: Service Processing Started
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          eventType: 'SERVICE_PROCESSING',
          title: 'Your Service Is Being Processed',
          body: `Processing for your ${svcName} service has started at ${counterNum}.`,
        });
      } else if (status === 'COMPLETED') {
        // Section 4: Service Completed
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          eventType: 'SERVICE_COMPLETED',
          title: 'Service Completed',
          body: `Your service for ${svcName} has been completed successfully.`,
        });
      } else if (status === 'NO_SHOW' || status === 'SKIPPED') {
        // Section 5: Token Skipped
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          eventType: 'TOKEN_SKIPPED',
          title: 'Your Token Has Been Skipped',
          body: `Your token ${tokenNum} has been skipped. Please check with the assigned counter or staff for the next steps.`,
        });
      } else if (status === 'CANCELLED') {
        // Section 6: Token Cancelled
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          eventType: 'TOKEN_CANCELLED',
          title: 'Token Cancelled',
          body: `Your token ${tokenNum} has been cancelled.`,
        });
      } else if (status === 'CALLED') {
        // Section 6: Token Called
        await notificationService.sendQueuePushNotification({
          userId: token.user_id,
          tokenId: token.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: counterNum,
          eventType: 'TOKEN_CALLED',
          title: 'Token Called',
          body: `Your token ${tokenNum} has been called. Please proceed to ${counterNum}.`,
        });
      }
    }

    res.json({ success: true, data: token } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const routeNextTable = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nextCounter } = req.body;

    if (!nextCounter) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'nextCounter is required.' } });
      return;
    }

    // Normalize destination counter code (e.g. C2 -> C-02)
    const match = String(nextCounter).match(/C-?0*(\d+)/i) || String(nextCounter).match(/Counter\s*0*(\d+)/i);
    const normalizedNext = match ? (parseInt(match[1], 10) < 10 ? `C-0${parseInt(match[1], 10)}` : `C-${match[1]}`) : nextCounter;

    // Fetch existing token to track current counter & sequence
    const { data: existingToken } = await supabaseAdmin
      .from('queue_tokens')
      .select('counter_number, current_counter_index, token_number, services(name), user_id')
      .eq('id', id)
      .maybeSingle();

    const prevCounter = existingToken?.counter_number || 'Previous Desk';
    const nextIdx = (existingToken?.current_counter_index ?? 0) + 1;

    // Requirement 2: Counter transfer must NEVER automatically mark the service completed!
    // Transferred token is assigned to the new counter in WAITING status.
    const updates: Record<string, any> = {
      status: 'WAITING',
      counter_number: normalizedNext,
      next_counter: null,
      current_counter_index: nextIdx,
      called_at: null,
      service_started_at: null,
      updated_at: new Date().toISOString(),
    };

    let updateRes = await supabaseAdmin
      .from('queue_tokens')
      .update(updates)
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (updateRes.error && updateRes.error.code === '42703') {
      delete updates.next_counter;
      delete updates.current_counter_index;
      updateRes = await supabaseAdmin
        .from('queue_tokens')
        .update(updates)
        .eq('id', id)
        .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
        .single();
    }

    const { data: token, error } = updateRes;

    if (error || !token) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: error?.message || 'Failed to route next table.' } });
      return;
    }

    // Section 2: Table Redirection Push Notification
    if (token.user_id) {
      const tokenNum = token.token_number || 'Token';
      const svcName = token.services?.name || 'Government Service';
      await notificationService.sendQueuePushNotification({
        userId: token.user_id,
        tokenId: token.id,
        tokenNumber: tokenNum,
        serviceName: svcName,
        counterNumber: prevCounter,
        nextCounter: normalizedNext,
        eventType: 'TABLE_REDIRECTED',
        title: 'Please Proceed to Next Counter',
        body: `Your token ${tokenNum} has been transferred to Counter ${normalizedNext}. Please proceed to ${normalizedNext}.`,
      });
    }

    // Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: req.user?.id,
        actor_user_name: req.user?.fullName || 'Officer',
        actor_user_role: req.user?.role || 'employee',
        action: 'ROUTE_NEXT_TABLE',
        entity_type: 'queue_token',
        entity_id: token.id,
        details: `Token transferred from ${prevCounter} to Counter ${normalizedNext}. Citizen is now waiting at ${normalizedNext}.`,
      });
    } catch {}

    res.json({ success: true, data: token } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const cancelToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Verify token status and ownership
    const { data: existing } = await supabaseAdmin
      .from('queue_tokens')
      .select('id, user_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Token not found.' } });
      return;
    }

    if (userRole === 'citizen' && existing.user_id !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel your own token.' } });
      return;
    }

    // Business Rule: Tokens cannot be cancelled once an employee has called the token
    if (existing.status !== 'WAITING') {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL_CALLED_TOKEN',
          message: 'Tokens cannot be cancelled once an employee has called your token or processing has started.',
        },
      });
      return;
    }

    const { data: token, error } = await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (error) {
      res.status(400).json({ success: false, error: { code: 'CANCEL_FAILED', message: error.message } });
      return;
    }

    // Recalculate remaining waiting tokens
    const { data: remainingWaiting } = await supabaseAdmin
      .from('queue_tokens')
      .select('id')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true });

    if (remainingWaiting && remainingWaiting.length > 0) {
      for (let i = 0; i < remainingWaiting.length; i++) {
        await supabaseAdmin
          .from('queue_tokens')
          .update({
            people_ahead: i,
            estimated_wait_minutes: i * 5,
          })
          .eq('id', remainingWaiting[i].id);
      }
    }

    // Section 6: Token Cancelled Notification
    if (token && token.user_id) {
      const tokenNum = token.token_number || 'Token';
      const svcName = token.services?.name || 'Government Service';
      await notificationService.sendQueuePushNotification({
        userId: token.user_id,
        tokenId: token.id,
        tokenNumber: tokenNum,
        serviceName: svcName,
        counterNumber: token.counter_number,
        eventType: 'TOKEN_CANCELLED',
        title: 'Token Cancelled',
        body: `Your token ${tokenNum} has been cancelled.`,
      });
    }

    res.json({ success: true, data: token } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const advanceCounter = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: currentToken, error: fetchErr } = await supabaseAdmin
      .from('queue_tokens')
      .select('*, services(category)')
      .eq('id', id)
      .single();

    if (fetchErr || !currentToken) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Token not found.' } });
      return;
    }

    const path = Array.isArray(currentToken.counter_path) && currentToken.counter_path.length > 0
      ? currentToken.counter_path
      : ['Counter 1 (Intake)', 'Counter 3 (Verification)', 'Counter 5 (Dispatch)'];

    const nextIdx = (currentToken.current_counter_index ?? 0) + 1;

    let updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (nextIdx >= path.length) {
      updatePayload.status = 'COMPLETED';
      updatePayload.current_counter_index = nextIdx - 1;
    } else {
      updatePayload.current_counter_index = nextIdx;
      updatePayload.counter_number = path[nextIdx].split(':')[0].trim();
      updatePayload.status = 'WAITING';
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('queue_tokens')
      .update(updatePayload)
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (updateErr) {
      res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } });
      return;
    }

    if (updated && updated.user_id) {
      const tokenNum = updated.token_number || 'Token';
      const svcName = updated.services?.name || 'Government Service';
      if (updated.status === 'COMPLETED') {
        await notificationService.sendQueuePushNotification({
          userId: updated.user_id,
          tokenId: updated.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: updated.counter_number,
          eventType: 'SERVICE_COMPLETED',
          title: 'Service Completed',
          body: `Your service for ${svcName} has been completed successfully.`,
        });
      } else {
        await notificationService.sendQueuePushNotification({
          userId: updated.user_id,
          tokenId: updated.id,
          tokenNumber: tokenNum,
          serviceName: svcName,
          counterNumber: updated.counter_number,
          eventType: 'COUNTER_ADVANCED',
          title: 'Please Proceed to Next Counter',
          body: `Your token ${tokenNum} has moved to ${updated.counter_number}. Please proceed to the assigned counter.`,
        });
      }
    }

    res.json({ success: true, data: updated } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const rebookToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { timeSlot, slotDate } = req.body;

    let updateResult = await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'WAITING',
        time_slot: timeSlot,
        slot_date: slotDate || new Date().toISOString().split('T')[0],
        is_late: false,
        called_at: null,
        service_started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (updateResult.error && updateResult.error.code === '42703') {
      updateResult = await supabaseAdmin
        .from('queue_tokens')
        .update({
          status: 'WAITING',
          called_at: null,
          service_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
        .single();
    }

    const { data: updated, error: updateErr } = updateResult;

    if (updateErr) {
      res.status(500).json({ success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } });
      return;
    }

    const finalUpdated = {
      ...updated,
      time_slot: updated.time_slot || timeSlot,
      slot_date: updated.slot_date || slotDate || new Date().toISOString().split('T')[0],
      is_late: false,
    };

    if (finalUpdated && finalUpdated.user_id) {
      const tokenNum = finalUpdated.token_number || 'Token';
      const svcName = finalUpdated.services?.name || 'Government Service';
      await notificationService.sendQueuePushNotification({
        userId: finalUpdated.user_id,
        tokenId: finalUpdated.id,
        tokenNumber: tokenNum,
        serviceName: svcName,
        counterNumber: finalUpdated.counter_number,
        eventType: 'TOKEN_REBOOKED',
        title: 'Token Rebooked',
        body: `Your token ${tokenNum} for ${svcName} has been rescheduled for ${finalUpdated.slot_date} (${finalUpdated.time_slot}).`,
      });
    }

    res.json({ success: true, data: finalUpdated } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

