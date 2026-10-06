import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const createApplication = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { serviceId, serviceName, officeId, officeName, documents } = req.body;

    if (!serviceId || !userId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'serviceId and authentication required.' },
      });
      return;
    }

    const applicationNumber = `APP-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .insert({
        application_number: applicationNumber,
        user_id: userId,
        service_id: serviceId,
        office_id: officeId,
        status: 'SUBMITTED',
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
      });
      return;
    }

    // Insert Notification
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Application Submitted',
      message: `Your application ${applicationNumber} for ${serviceName || 'Service'} has been submitted.`,
      type: 'application',
      link_url: '/user/applications',
    });

    res.status(201).json({ success: true, data: app } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getUserApplications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select('*, services(name), offices(name)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error || !apps) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    res.json({ success: true, data: apps } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateApplicationStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .update({ status, remarks, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: error.message } });
      return;
    }

    // Log security audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: req.user?.id,
      actor_user_name: req.user?.fullName || 'Officer',
      actor_user_role: req.user?.role || 'employee',
      action: 'UPDATE_APPLICATION_STATUS',
      entity_type: 'application',
      entity_id: id,
      details: `Updated application ${id} status to ${status}. Remarks: ${remarks || 'None'}`,
    });

    res.json({ success: true, data: app } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
