import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const generateToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { serviceId, serviceName, officeId, applicationId } = req.body;

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
    const { count: waitingCount } = await supabaseAdmin
      .from('queue_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'WAITING');

    const totalWaiting = waitingCount || 0;
    const tokenNumber = `A${100 + totalWaiting + 1}`;

    const { data: token, error } = await supabaseAdmin
      .from('queue_tokens')
      .insert({
        token_number: tokenNumber,
        user_id: userId,
        service_id: resolvedServiceId,
        office_id: resolvedOfficeId,
        application_id: applicationId || null,
        status: 'WAITING',
        position: totalWaiting + 1,
        people_ahead: totalWaiting,
        estimated_wait_minutes: Math.max(5, totalWaiting * 5),
      })
      .select('*, services(id, name, code, category), offices(id, name)')
      .single();

    if (error || !token) {
      console.error('[GENERATE_TOKEN_ERROR]', error);
      res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: error?.message || 'Failed to issue token.' } });
      return;
    }

    // Insert Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Virtual Token Generated',
      message: `Your Virtual Queue Token ${tokenNumber} has been generated for ${serviceName || 'Service'}.`,
      type: 'queue',
      link_url: '/user/queue',
    });

    res.status(201).json({ success: true, data: token } as ApiResponse);
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

    const { data: token } = await supabaseAdmin
      .from('queue_tokens')
      .select('*, services(id, name, code, category), offices(id, name)')
      .eq('user_id', userId)
      .in('status', ['WAITING', 'CALLED', 'IN_SERVICE'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ success: true, data: token || null } as ApiResponse);
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
    const { status } = req.body;

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    }

    const { data: token, error } = await supabaseAdmin
      .from('queue_tokens')
      .update(updates)
      .eq('id', id)
      .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
      .single();

    if (error) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } });
      return;
    }

    res.json({ success: true, data: token } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
