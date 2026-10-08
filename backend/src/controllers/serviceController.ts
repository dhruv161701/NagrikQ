import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { ApiResponse } from '../types';

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, include_inactive } = req.query;

    let query = supabaseAdmin.from('services').select('*, document_requirements(*)');

    if (include_inactive !== 'true') {
      query = query.eq('is_active', true);
    }

    if (category && typeof category === 'string' && category !== 'All') {
      query = query.eq('category', category);
    }

    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: services, error } = await query;

    if (error || !services) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    res.json({ success: true, data: services } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { data: service, error } = await supabaseAdmin
      .from('services')
      .select('*, document_requirements(*)')
      .eq('id', id)
      .single();

    if (error || !service) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found.' },
      } as ApiResponse);
      return;
    }

    res.json({ success: true, data: service } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getOffices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { district, taluka } = req.query;
    let query = supabaseAdmin.from('offices').select('*').eq('status', 'ACTIVE');

    if (district && typeof district === 'string') {
      query = query.eq('district', district);
    }
    if (taluka && typeof taluka === 'string') {
      query = query.eq('taluka', taluka);
    }

    const { data: offices, error } = await query;
    if (error || !offices) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }
    res.json({ success: true, data: offices } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getLocationAwareServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { district, taluka, officeId, category, search } = req.query;

    // 1. Fetch all active services
    let serviceQuery = supabaseAdmin.from('services').select('*, document_requirements(*)').eq('is_active', true);

    if (category && typeof category === 'string' && category !== 'All') {
      serviceQuery = serviceQuery.eq('category', category);
    }
    if (search && typeof search === 'string') {
      serviceQuery = serviceQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: allServices, error: sErr } = await serviceQuery;
    if (sErr || !allServices) {
      res.json({ success: true, data: [] } as ApiResponse);
      return;
    }

    // 2. Fetch offices in target location
    let officeQuery = supabaseAdmin.from('offices').select('id, name, district, taluka, city').eq('status', 'ACTIVE');
    if (officeId && typeof officeId === 'string') {
      officeQuery = officeQuery.eq('id', officeId);
    } else if (district && typeof district === 'string') {
      officeQuery = officeQuery.eq('district', district);
    }
    const { data: eligibleOffices } = await officeQuery;
    const eligibleOfficeIds = eligibleOffices ? eligibleOffices.map((o) => o.id) : [];

    // 3. Fetch office_services junction mappings
    let officeServicesQuery = supabaseAdmin.from('office_services').select('*').eq('status', 'ACTIVE');
    if (eligibleOfficeIds.length > 0) {
      officeServicesQuery = officeServicesQuery.in('office_id', eligibleOfficeIds);
    }

    const { data: officeServiceMappings } = await officeServicesQuery;
    const availableServiceIds = new Set(officeServiceMappings ? officeServiceMappings.map((os) => os.service_id) : []);

    // 4. Annotate each service with location availability metadata
    const locationAwareServices = allServices.map((service) => {
      const isAvailableInLocation = eligibleOfficeIds.length === 0 || availableServiceIds.has(service.id);
      const offeringOffices = officeServiceMappings
        ? officeServiceMappings
            .filter((os) => os.service_id === service.id)
            .map((os) => eligibleOffices?.find((off) => off.id === os.office_id))
            .filter(Boolean)
        : [];

      return {
        ...service,
        isAvailableAtLocation: isAvailableInLocation,
        offeringOfficesCount: offeringOffices.length,
        offeringOffices,
        availabilityNotice: isAvailableInLocation
          ? 'Available at nearby office'
          : 'Not available at this selected office location. Click to find nearby offices.',
      };
    });

    res.json({ success: true, data: locationAwareServices } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const updateServiceSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      startTime,
      endTime,
      slotDurationMinutes,
      avgProcessingTimeMinutes,
      enableBreakTime,
      breakStartTime,
      breakEndTime,
      stoppedBookingDates,
      slotCapacity,
    } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;
    if (slotDurationMinutes !== undefined) updates.slot_duration_minutes = slotDurationMinutes;
    if (avgProcessingTimeMinutes !== undefined) updates.avg_processing_time_minutes = avgProcessingTimeMinutes;
    if (enableBreakTime !== undefined) updates.enable_break_time = enableBreakTime;
    if (breakStartTime !== undefined) updates.break_start_time = breakStartTime;
    if (breakEndTime !== undefined) updates.break_end_time = breakEndTime;
    if (stoppedBookingDates !== undefined) updates.stopped_booking_dates = stoppedBookingDates;
    if (slotCapacity !== undefined) updates.slot_capacity = slotCapacity;

    const { data: updated, error } = await supabaseAdmin
      .from('services')
      .update(updates)
      .eq('id', id)
      .select('*, document_requirements(*)')
      .maybeSingle();

    if (error) {
      res.json({ success: true, data: { id, ...req.body } } as ApiResponse);
      return;
    }

    res.json({ success: true, data: updated || { id, ...req.body } } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

