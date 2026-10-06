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

    const tokenNumber = `A${Math.floor(100 + Math.random() * 900)}`;

    const { data: token, error } = await supabaseAdmin
      .from('queue_tokens')
      .insert({
        token_number: tokenNumber,
        user_id: userId,
        service_id: serviceId,
        office_id: officeId,
        application_id: applicationId,
        status: 'WAITING',
        position: 1,
        people_ahead: 0,
        estimated_wait_minutes: 10,
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: error.message } });
      return;
    }

    // Insert Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Virtual Token Generated',
      message: `Your Virtual Queue Token ${tokenNumber} has been generated.`,
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
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ success: true, data: token || null } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const callNextToken = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { counterNumber } = req.body;

    const { data: nextToken, error } = await supabaseAdmin
      .from('queue_tokens')
      .update({
        status: 'CALLED',
        counter_number: counterNumber || 'C-01',
        called_at: new Date().toISOString(),
      })
      .eq('status', 'WAITING')
      .order('created_at', { ascending: true })
      .limit(1)
      .select('*')
      .maybeSingle();

    if (error || !nextToken) {
      res.json({ success: true, data: null, message: 'No waiting citizens in queue.' } as ApiResponse);
      return;
    }

    // Log security audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: req.user?.id,
      actor_user_name: req.user?.fullName || 'Officer',
      actor_user_role: req.user?.role || 'employee',
      action: 'CALL_NEXT_QUEUE',
      entity_type: 'queue_token',
      entity_id: nextToken.id,
      details: `Officer called next token ${nextToken.token_number} to counter ${counterNumber || 'C-01'}.`,
    });

    res.json({ success: true, data: nextToken } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
