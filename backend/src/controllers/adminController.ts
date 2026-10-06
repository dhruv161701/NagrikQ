import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const createChangeRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { serviceId, serviceName, officeName, currentDocumentNames, proposedDocumentNames, addedDocumentName, reason } = req.body;

    if (!serviceId || !addedDocumentName || !reason) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'serviceId, addedDocumentName, and reason are required.' },
      });
      return;
    }

    const requestNumber = `CR-2026-${Math.floor(100 + Math.random() * 900)}`;

    const { data: cr, error } = await supabaseAdmin
      .from('service_change_requests')
      .insert({
        request_number: requestNumber,
        service_id: serviceId,
        requested_by_admin_id: adminId,
        office_name: officeName || 'Office Admin',
        current_document_names: currentDocumentNames || [],
        proposed_document_names: proposedDocumentNames || [],
        added_document_name: addedDocumentName,
        reason: reason,
        status: 'PENDING',
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ success: false, error: { code: 'DATABASE_ERROR', message: error.message } });
      return;
    }

    // Log security audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: adminId,
      actor_user_name: req.user?.fullName || 'Admin',
      actor_user_role: req.user?.role || 'admin',
      action: 'CREATE_CHANGE_REQUEST',
      entity_type: 'service_change_request',
      entity_id: cr.id,
      details: `Created Change Request ${requestNumber} to add document '${addedDocumentName}' to ${serviceName || 'Service'}. Reason: ${reason}`,
    });

    res.status(201).json({ success: true, data: cr } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getChangeRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { data: crs, error } = await supabaseAdmin
      .from('service_change_requests')
      .select('*, services(name, code)')
      .order('submitted_at', { ascending: false });

    if (error || !crs) {
      console.error('[GET_CHANGE_REQUESTS_ERROR]', error);
      const { data: fallbackCrs } = await supabaseAdmin
        .from('service_change_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      res.json({ success: true, data: fallbackCrs || [] } as ApiResponse);
      return;
    }

    res.json({ success: true, data: crs } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !logs) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    res.json({ success: true, data: logs } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const createEmployeeUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const {
      fullName,
      email,
      phone,
      employeeId,
      designation,
      aadhaarLast4,
      aadhaarVerified,
      verificationRef,
      department,
      departmentId,
      district,
      taluka,
      officeId,
      counterId,
      counterNumber,
      assignedServices,
      permissions,
      tempPassword,
    } = req.body;

    if (!fullName || !email || !employeeId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Full Name, Official Email, and Employee ID are required.' },
      });
      return;
    }

    // Security Scope Check: Verify Admin's authorized office scope if admin is restricted
    if (req.user?.role === 'admin') {
      const { data: adminStaff } = await supabaseAdmin
        .from('staff_profiles')
        .select('office_id')
        .eq('id', adminId)
        .maybeSingle();

      if (adminStaff?.office_id && officeId && adminStaff.office_id !== officeId) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_SCOPE', message: 'Admin can only create employees within their authorized office scope.' },
        });
        return;
      }
    }

    const generatedPassword = tempPassword || `NagrikQ@${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Create Supabase Auth User securely via server-side Supabase Admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'employee',
      },
    });

    if (authError || !authData.user) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_CREATION_FAILED', message: authError?.message || 'Failed to create employee Auth account.' },
      });
      return;
    }

    const userId = authData.user.id;

    // 2. Create profile row
    await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: fullName,
        email,
        phone: phone || '+91 9876543210',
        role: 'employee',
        onboarding_completed: true,
        district: district || 'Rajkot',
      },
      { onConflict: 'id' }
    );

    // 3. Create staff_profile row (Aadhaar is strictly last 4 digits only!)
    const { data: staffProfile } = await supabaseAdmin
      .from('staff_profiles')
      .upsert(
        {
          id: userId,
          user_id: userId,
          employee_id: employeeId,
          designation: designation || 'Junior Officer',
          department: department || 'Revenue Department',
          department_id: departmentId || null,
          district: district || 'Rajkot',
          taluka: taluka || 'Rajkot',
          office_id: officeId || null,
          counter_id: counterId || null,
          phone: phone || '+91 9876543210',
          aadhaar_last4: aadhaarLast4 ? String(aadhaarLast4).slice(-4) : null,
          aadhaar_verified: !!aadhaarVerified,
          verification_ref: generatedPassword,
          permissions: permissions || ['VIEW_APPLICATIONS', 'REVIEW_APPLICATION', 'CALL_NEXT_TOKEN'],
          role: 'employee',
          status: 'ACTIVE',
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    // 4. Create officers row for queue/counter compatibility
    await supabaseAdmin.from('officers').upsert(
      {
        user_id: userId,
        employee_code: employeeId,
        designation: designation || 'Junior Officer',
        counter_number: counterNumber || 'C-01',
        office_id: officeId || null,
        is_active: true,
        assigned_service_ids: assignedServices || [],
      },
      { onConflict: 'employee_code' }
    );

    // 5. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: adminId,
      actor_user_name: req.user?.fullName || 'Admin',
      actor_user_role: req.user?.role || 'admin',
      action: 'CREATE_EMPLOYEE_ACCOUNT',
      entity_type: 'staff_profile',
      entity_id: userId,
      details: `Created Employee account for ${fullName} (${email}) - Employee ID: ${employeeId}.`,
    });

    res.status(201).json({
      success: true,
      data: {
        employee: staffProfile || { id: userId, email, fullName, employeeId, role: 'employee' },
        credentials: {
          email,
          temporaryPassword: generatedPassword,
          note: 'Provide these credentials securely to the employee.',
        },
      },
    } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getEmployeesList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    let query = supabaseAdmin.from('staff_profiles').select('*, profiles!user_id(full_name, email)').eq('role', 'employee');

    // Scoping for admin
    if (req.user?.role === 'admin') {
      const { data: adminStaff } = await supabaseAdmin
        .from('staff_profiles')
        .select('office_id')
        .eq('id', adminId)
        .maybeSingle();

      if (adminStaff?.office_id) {
        query = query.eq('office_id', adminStaff.office_id);
      }
    }

    const { data: employees, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_EMPLOYEES_ERROR]', error);
      let fallbackQuery = supabaseAdmin.from('staff_profiles').select('*').eq('role', 'employee');
      const { data: fallbackEmployees } = await fallbackQuery.order('created_at', { ascending: false });
      res.json({ success: true, data: fallbackEmployees || [] } as ApiResponse);
      return;
    }

    const formattedEmployees = (employees || []).map((emp: any) => ({
      ...emp,
      full_name: emp.profiles?.full_name || emp.full_name || 'Counter Officer',
      email: emp.profiles?.email || emp.email || '',
    }));

    res.json({ success: true, data: formattedEmployees } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const setupOfficeConfig = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { officeInfo, selectedServiceIds, counters, queueConfig } = req.body;

    if (!officeInfo?.name || !officeInfo?.district) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Office name and district are required.' },
      });
      return;
    }

    // 1. Create or update office
    const officeCode = officeInfo.code || `OFF-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: office, error: officeError } = await supabaseAdmin
      .from('offices')
      .upsert(
        {
          name: officeInfo.name,
          code: officeCode,
          district: officeInfo.district,
          subdivision: officeInfo.subdivision || officeInfo.district,
          taluka: officeInfo.taluka || officeInfo.city || officeInfo.district,
          city: officeInfo.city || officeInfo.district,
          address: officeInfo.address || 'Government Office Complex',
          contact_number: officeInfo.contactNumber || '0281-2451000',
          email: officeInfo.email || null,
          total_counters: counters?.length || 5,
          opening_time: officeInfo.openingTime || '09:00 AM',
          closing_time: officeInfo.closingTime || '05:00 PM',
          working_days: officeInfo.workingDays || 'Monday - Saturday',
          status: 'ACTIVE',
        },
        { onConflict: 'code' }
      )
      .select('*')
      .single();

    if (officeError || !office) {
      res.status(400).json({ success: false, error: { code: 'OFFICE_SETUP_FAILED', message: officeError?.message } });
      return;
    }

    const officeId = office.id;

    // 2. Link selected services to office via office_services junction table
    if (Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0) {
      const officeServiceRows = selectedServiceIds.map((serviceId: string) => ({
        office_id: officeId,
        service_id: serviceId,
        status: 'ACTIVE',
      }));

      await supabaseAdmin.from('office_services').upsert(officeServiceRows, { onConflict: 'office_id,service_id' });
    }

    // 3. Setup counters
    if (Array.isArray(counters) && counters.length > 0) {
      const counterRows = counters.map((c: any, index: number) => ({
        office_id: officeId,
        counter_number: c.number || `C-0${index + 1}`,
        name: c.name || `Counter ${index + 1}`,
        type: c.type || 'GENERAL',
        status: 'ACTIVE',
        queue_enabled: true,
      }));

      await supabaseAdmin.from('counters').upsert(counterRows, { onConflict: 'office_id,counter_number' });
    }

    // 4. Update Admin staff_profile office_id linkage
    await supabaseAdmin
      .from('staff_profiles')
      .update({ office_id: officeId, district: officeInfo.district, taluka: officeInfo.taluka })
      .eq('id', adminId);

    // 5. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: adminId,
      actor_user_name: req.user?.fullName || 'Admin',
      actor_user_role: req.user?.role || 'admin',
      action: 'SETUP_OFFICE_CONFIGURATION',
      entity_type: 'office',
      entity_id: officeId,
      details: `Admin configured office '${officeInfo.name}' in ${officeInfo.district} with ${selectedServiceIds?.length || 0} services and ${counters?.length || 0} counters.`,
    });

    res.status(200).json({
      success: true,
      data: {
        office,
        message: 'Office configuration successfully activated!',
      },
    } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
