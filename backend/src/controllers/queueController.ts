import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { supabaseAdmin } from '../config/supabase';

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

    // Count waiting tokens today to assign next sequential number and position
    const bookingDate = slotDate || new Date().toISOString().split('T')[0];

    // Check duplicate booking: same user cannot book the same service multiple times in a day
    const { data: existingBooking } = await supabaseAdmin
      .from('queue_tokens')
      .select('id, token_number, time_slot, status, slot_date')
      .eq('user_id', userId)
      .eq('service_id', resolvedServiceId)
      .or(`slot_date.eq.${bookingDate},queue_date.eq.${bookingDate}`)
      .not('status', 'in', '("CANCELLED")')
      .limit(1)
      .maybeSingle();

    if (existingBooking) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_BOOKING',
          message: `You already have a booking (Token ${existingBooking.token_number} for slot ${existingBooking.time_slot || 'scheduled'}) for this service on ${bookingDate}. Same user cannot book the same service multiple times on the same day.`,
        },
      });
      return;
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

    const basePayload: any = {
      token_number: tokenNumber,
      user_id: userId,
      service_id: resolvedServiceId,
      office_id: resolvedOfficeId,
      application_id: finalAppId || null,
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
    };

    // Insert Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Virtual Token Generated',
      message: `Your Virtual Queue Token ${tokenNumber} has been generated for ${serviceName || 'Service'}.`,
      type: 'queue',
      link_url: '/user/queue',
    });

    res.status(201).json({ success: true, data: finalTokenData } as ApiResponse);
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

    if (serviceIds && typeof serviceIds === 'string') {
      const ids = serviceIds.split(',').filter(Boolean);
      if (ids.length > 0) {
        query = query.in('service_id', ids);
      }
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
    const targetCounter = counterNumber || 'C-04';

    // 1. If officer already has an IN_SERVICE citizen at this counter, complete it
    await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('counter_number', targetCounter)
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

    // 2. Query for next waiting citizen matching officer's assigned services
    let query = supabaseAdmin
      .from('queue_tokens')
      .select('id, token_number, user_id, service_id, status')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(1);

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      query = query.in('service_id', serviceIds);
    }

    const { data: waitingList, error: findError } = await query;

    if (findError || !waitingList || waitingList.length === 0) {
      res.json({
        success: true,
        data: null,
        message: 'No citizens currently waiting for your assigned services.',
      } as ApiResponse);
      return;
    }

    const targetToken = waitingList[0];

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

    if (token && nextCounter) {
      token.next_counter = token.next_counter || nextCounter;
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

    const updates: Record<string, any> = {
      status: 'COMPLETED',
      next_counter: nextCounter,
      completed_at: new Date().toISOString(),
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

    token.next_counter = token.next_counter || nextCounter;

    // Send realtime notification to citizen
    if (token.user_id) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: token.user_id,
          title: `Please go to ${nextCounter}`,
          message: `Your service at Counter ${token.counter_number || 'current table'} is complete. Please physically proceed to Table ${nextCounter}.`,
          type: 'queue',
          link_url: '/user/queue',
        });
      } catch (notifErr) {
        console.warn('Failed to insert route notification:', notifErr);
      }
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
        details: `Turn completed at ${token.counter_number || 'counter'}. Citizen directed to table ${nextCounter}.`,
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

    // Verify token ownership if citizen
    if (userRole === 'citizen') {
      const { data: existing } = await supabaseAdmin
        .from('queue_tokens')
        .select('id, user_id')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only cancel your own token.' } });
        return;
      }
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

    res.json({ success: true, data: finalUpdated } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

