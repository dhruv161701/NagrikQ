import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {
  Service,
  Office,
  Employee,
  Application,
  QueueToken,
  ChangeRequest,
  AuditLog,
  NotificationItem,
  DocumentRequirement,
} from '../types';
import { mockRepository } from '../services/repositories';
import { supabase } from '../config/supabase';
import { getAuthToken } from '../services/auth/authToken';
import { useAuth } from './AuthContext';
import {
  DEFAULT_COUNTER_SEQUENCES,
  SERVICE_DOCUMENT_VALIDITY,
} from '../data/indianLocations';
import { formatCounterDisplay } from '../utils/cityTables';

export interface IssueTokenOptions {
  officeId?: string;
  timeSlot?: string;
  slotDate?: string;
  selectedState?: string;
  selectedCity?: string;
  counterPath?: string[];
  documents?: any[];
}

interface DataContextType {
  services: Service[];
  offices: Office[];
  employees: Employee[];
  applications: Application[];
  queueTokens: QueueToken[];
  isQueueTokensLoaded: boolean;
  changeRequests: ChangeRequest[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  refreshServices: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  refreshQueueTokens: () => Promise<void>;
  refreshChangeRequests: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  getServiceById: (id: string) => Service | undefined;
  getUserActiveToken: (userId: string) => QueueToken | undefined;
  getUserQueueTokens: (userId: string) => QueueToken[];
  getUserApplications: (userId: string) => Application[];
  issueQueueToken: (
    citizenId: string,
    citizenName: string,
    citizenPhone: string,
    serviceId: string,
    serviceName: string,
    options?: string | IssueTokenOptions
  ) => Promise<QueueToken> | QueueToken;
  cancelQueueToken: (tokenId: string) => Promise<boolean> | void;
  advanceTokenCounterStep: (tokenId: string) => Promise<void>;
  rebookExpiredTokenSlot: (tokenId: string, newTimeSlot: string, newSlotDate?: string) => Promise<QueueToken | undefined>;
  updateEmployeeBreakSchedule: (employeeId: string, breakStartTime: string, breakEndTime: string) => Promise<void>;
  callNextToken: (counterNumber?: string, serviceIds?: string[]) => Promise<QueueToken | undefined>;
  updateTokenStatus: (tokenId: string, status: QueueToken['status'], nextCounter?: string) => Promise<void>;
  routeToNextTable: (tokenId: string, nextCounter: string) => Promise<void>;
  submitApplication: (serviceId: string, serviceName: string, citizenId: string, citizenName: string, citizenPhone: string, docs: { requirementId: string; requirementName: string; fileName: string }[]) => Promise<Application> | Application;
  updateDocumentStatus: (applicationId: string, docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION', notes?: string) => Promise<void>;
  updateApplicationStatus: (applicationId: string, status: Application['status'], note: string) => Promise<void>;
  createChangeRequest: (serviceId: string, serviceName: string, adminId: string, adminName: string, currentDocs: DocumentRequirement[], newDocName: string, reason: string) => ChangeRequest;
  reviewChangeRequest: (crId: string, isApproved: boolean, reviewerName: string, reviewNote?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const mapDBServiceToService = (item: any): Service => {
  const category = item.category || 'General';
  const defaultPath = (DEFAULT_COUNTER_SEQUENCES as any)[category] || DEFAULT_COUNTER_SEQUENCES.Default;
  const validity = item.document_validity || (SERVICE_DOCUMENT_VALIDITY as any)[item.name] || 'Valid for 3 Years';
  const slotCap = item.slot_capacity || Math.max(2, Math.floor(30 / (item.processing_time_days > 10 ? 10 : 5)));

  return {
    id: item.id,
    code: item.code || 'SRV-001',
    name: item.name,
    category,
    description: item.description || '',
    processingTimeDays: item.processing_time_days ?? item.processingTimeDays ?? 7,
    feeAmount: item.fee_amount ?? item.feeAmount ?? 0,
    departmentId: item.department_id || item.departmentId || 'dept-001',
    departmentName: item.department_name || item.departmentName || 'Revenue Department',
    requiredDocuments: Array.isArray(item.document_requirements) && item.document_requirements.length > 0
      ? item.document_requirements.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          isRequired: d.is_required !== undefined ? d.is_required : true,
          fileTypes: d.file_types || ['pdf', 'jpg', 'png'],
          maxSizeMb: d.max_size_mb || 5,
          validityPeriod: d.validity_period || validity,
        }))
      : (item.requiredDocuments || []),
    isActive: item.is_active !== undefined ? item.is_active : true,
    iconName: item.icon_name || item.iconName || 'FileText',
    eligibilityCriteria: item.eligibility_criteria || item.eligibilityCriteria || [],
    applicableStates: item.applicable_states || ['Gujarat', 'Maharashtra', 'Karnataka', 'Rajasthan', 'Delhi'],
    applicableCities: item.applicable_cities || ['Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Mumbai City', 'Pune', 'Bengaluru Urban', 'Jaipur', 'New Delhi'],
    slotCapacity: slotCap,
    counterPath: item.counter_path || defaultPath,
    documentValidity: validity,
    stoppedBookingDates: item.stopped_booking_dates || item.stoppedBookingDates || [],
    isBookingStopped: Array.isArray(item.stopped_booking_dates) && item.stopped_booking_dates.includes(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })),
  };
};

const mapDBAppToApplication = (row: any): Application => ({
  id: row.id,
  applicationNumber: row.application_number || `APP-${row.id.slice(0, 6)}`,
  serviceId: row.service_id,
  serviceName: row.services?.name || 'Government Service',
  citizenId: row.user_id,
  citizenName: row.profiles?.full_name || 'Citizen Applicant',
  citizenPhone: row.profiles?.phone || '+91 9876543210',
  submittedAt: new Date(row.submitted_at || Date.now()).toLocaleString(),
  status: row.status || 'SUBMITTED',
  officeId: row.office_id || 'off-001',
  officeName: row.offices?.name || 'Rajkot District Collector Office',
  documents: Array.isArray(row.documents)
    ? row.documents.map((d: any) => ({
        id: d.id,
        requirementId: d.document_requirement_id || d.id,
        requirementName: d.requirement_name || 'Verified Certificate',
        fileUrl: d.storage_path || '#',
        fileName: d.file_name || 'document.pdf',
        status: d.verification_status || 'PENDING',
        notes: d.notes,
      }))
    : [],
  timeline: [
    {
      status: row.status || 'SUBMITTED',
      timestamp: new Date(row.submitted_at || Date.now()).toLocaleString(),
      note: row.remarks || 'Application registered in state system.',
    },
  ],
});

const mapDBTokenToQueueToken = (row: any): QueueToken => {
  const serviceCategory = row.services?.category || 'Revenue';
  const defaultPath = (DEFAULT_COUNTER_SEQUENCES as any)[serviceCategory] || DEFAULT_COUNTER_SEQUENCES.Default;
  const counterPath = Array.isArray(row.counter_path) && row.counter_path.length > 0 ? row.counter_path : defaultPath;
  const currentIdx = row.current_counter_index ?? 0;
  const calculatedCounter = counterPath[currentIdx] ? counterPath[currentIdx].split(':')[0].trim() : 'C-04';

  let resolvedSlot = row.time_slot;
  let resolvedSlotDate = row.slot_date;
  if (!resolvedSlot && row.applications?.remarks) {
    const remarks = String(row.applications.remarks);
    if (remarks.startsWith('{')) {
      try {
        const parsed = JSON.parse(remarks);
        if (parsed.timeSlot) resolvedSlot = parsed.timeSlot;
        if (parsed.slotDate) resolvedSlotDate = parsed.slotDate;
      } catch {
        // ignore
      }
    } else if (remarks.includes('Online booking for ')) {
      const match = remarks.replace('Online booking for ', '').trim();
      if (match.includes(' - ')) resolvedSlot = match;
    }
  }

  return {
    id: row.id,
    tokenNumber: row.token_number || 'A101',
    citizenId: row.user_id,
    citizenName: row.profiles?.full_name || 'Citizen User',
    citizenPhone: row.profiles?.phone || '+91 9876543210',
    serviceId: row.service_id,
    serviceName: row.services?.name || 'Government Service',
    officeId: row.office_id || 'off-001',
    officeName: row.offices?.name || 'Rajkot Jan Seva Kendra',
    counterNumber: row.counter_number || calculatedCounter,
    issuedAt: new Date(row.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedWaitMinutes: row.estimated_wait_minutes ?? 5,
    peopleAhead: row.people_ahead ?? 0,
    status: (row.status as any) || 'WAITING',
    timeSlot: resolvedSlot || '',
    slotDate: resolvedSlotDate || (row.queue_date ? String(row.queue_date) : new Date().toISOString().split('T')[0]),
    selectedState: row.selected_state || row.offices?.state || 'Gujarat',
    selectedCity: row.selected_city || row.offices?.district || 'Rajkot',
    counterPath,
    currentCounterIndex: currentIdx,
    nextCounter: row.next_counter || row.nextCounter || (row.applications?.remarks && String(row.applications.remarks).includes('Direct to Table ') ? String(row.applications.remarks).replace('Direct to Table ', '').trim() : undefined),
    isLate: !!row.is_late,
    gracePeriodMinutes: row.grace_period_minutes || 15,
    submittedDocuments: Array.isArray(row.submitted_documents) ? row.submitted_documents : undefined,
  };
};

const mapDBChangeRequestToChangeRequest = (row: any): ChangeRequest => ({
  id: row.id,
  requestNumber: row.request_number || `CR-${row.id.slice(0, 6)}`,
  serviceId: row.service_id,
  serviceName: row.services?.name || row.service_name || 'Government Service',
  requestedByAdminId: row.requested_by_admin_id || row.admin_id || '',
  requestedByAdminName: row.requested_by_admin_name || row.admin_name || 'Mamlatdar Admin',
  officeName: row.office_name || 'Rajkot District Collector Office',
  currentDocumentIds: row.current_document_ids || [],
  currentDocumentNames: row.current_document_names || [],
  proposedDocumentIds: row.proposed_document_ids || [],
  proposedDocumentNames: row.proposed_document_names || [],
  addedDocumentName: row.added_document_name || 'Document Proof',
  reason: row.reason || '',
  status: row.status || 'PENDING',
  submittedAt: new Date(row.submitted_at || Date.now()).toLocaleDateString(),
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : undefined,
  reviewedBySuperAdminName: row.reviewed_by_name,
  reviewNote: row.review_note,
});

const mapDBAuditLogToAuditLog = (row: any): AuditLog => ({
  id: row.id,
  userId: row.actor_user_id || '',
  userName: row.actor_user_name || 'System / Administrator',
  userRole: (row.actor_user_role || 'admin') as any,
  action: row.action || 'SYSTEM_EVENT',
  entity: row.entity_type || 'System',
  details: row.details || '',
  timestamp: row.timestamp || row.created_at || new Date().toISOString(),
  ipAddress: row.ip_address || '127.0.0.1',
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [, setTick] = useState(0);
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [dbApplications, setDbApplications] = useState<Application[]>([]);
  const [dbQueueTokens, setDbQueueTokens] = useState<QueueToken[]>([]);
  const [isQueueTokensLoaded, setIsQueueTokensLoaded] = useState(false);
  const [dbChangeRequests, setDbChangeRequests] = useState<ChangeRequest[]>([]);
  const [dbOffices, setDbOffices] = useState<Office[]>([]);
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);
  const [dbAuditLogs, setDbAuditLogs] = useState<AuditLog[]>([]);

  // 1. Fetch Services (Public - no auth required, include inactive only for superadmin)
  const fetchServicesFromAPI = useCallback(async () => {
    try {
      const isSuperAdmin = currentUser?.role === 'superadmin';
      const endpoint = isSuperAdmin ? '/api/services?include_inactive=true' : '/api/services';
      const res = await fetch(endpoint);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(mapDBServiceToService);
          setDbServices(mapped);
          return;
        }
      }

      let query = supabase.from('services').select('*, document_requirements(*)');
      if (!isSuperAdmin) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setDbServices(data.map(mapDBServiceToService));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch services:', err);
    }
  }, [currentUser?.role]);

  // 2. Fetch Applications (Requires authenticated session)
  const fetchApplicationsFromAPI = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        // Unauthenticated visitor: do not fire protected API endpoint
        return;
      }

      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(mapDBAppToApplication);
          const deduped: Application[] = Array.from(new Map(mapped.map((a: Application) => [a.id, a])).values()) as Application[];
          setDbApplications(deduped);
          return;
        }
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*, services(id, name, code, category), offices(id, name), documents(*)')
        .order('submitted_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapDBAppToApplication);
        const deduped: Application[] = Array.from(new Map(mapped.map((a: Application) => [a.id, a])).values()) as Application[];
        setDbApplications(deduped);
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch applications:', err);
    }
  }, []);

  // 3. Fetch Queue Tokens (Protected - officer queue requires employee/admin/superadmin role, citizen uses /api/queue/my-tokens)
  const fetchQueueTokensFromAPI = useCallback(async (forcedRole?: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setIsQueueTokensLoaded(true);
        return;
      }

      const role = forcedRole || currentUser?.role || 'citizen';
      const isStaff = ['employee', 'admin', 'superadmin'].includes(role);

      // If citizen (or pending role resolution), fetch tokens via backend endpoint /api/queue/my-tokens (uses supabaseAdmin)
      if (!isStaff) {
        try {
          const res = await fetch('/api/queue/my-tokens', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const ct = res.headers.get('content-type');
          if (res.ok && ct && ct.includes('application/json')) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              if (json.data.length > 0) {
                setDbQueueTokens(json.data.map(mapDBTokenToQueueToken));
              } else {
                setDbQueueTokens((prev) => (prev.length > 0 ? prev : []));
              }
              setIsQueueTokensLoaded(true);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('[DataContext] Failed /api/queue/my-tokens, falling back to direct query:', apiErr);
        }

        // Direct Supabase query fallback (WITHOUT profiles:user_id join to eliminate 42P17 recursion)
        let query = supabase
          .from('queue_tokens')
          .select('*, services(id, name, code, category), offices(id, name), applications(id, remarks)')
          .order('created_at', { ascending: false });

        if (currentUser?.id) {
          query = query.eq('user_id', currentUser.id);
        }

        const { data, error } = await query;

        if (!error && Array.isArray(data)) {
          if (data.length > 0) {
            setDbQueueTokens(data.map(mapDBTokenToQueueToken));
          }
        } else if (error) {
          console.warn('[DataContext] Direct queue_tokens query warning:', error);
        }
        setIsQueueTokensLoaded(true);
        return;
      }

      const res = await fetch('/api/queue/tokens', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map(mapDBTokenToQueueToken);
          setDbQueueTokens(mapped);
          setIsQueueTokensLoaded(true);
          return;
        }
      }

      const { data, error } = await supabase
        .from('queue_tokens')
        .select('*, services(id, name, code, category), offices(id, name), applications(id, remarks)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDbQueueTokens(data.map(mapDBTokenToQueueToken));
      }
      setIsQueueTokensLoaded(true);
    } catch (err) {
      console.warn('[DataContext] Failed to fetch queue tokens:', err);
      setIsQueueTokensLoaded(true);
    }
  }, [currentUser?.role, currentUser?.id]);

  // 4. Fetch Change Requests (Protected - requires admin or superadmin role)
  const fetchChangeRequestsFromAPI = useCallback(async (forcedRole?: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        // Unauthenticated visitor: do not fire protected API endpoint
        return;
      }

      const role = forcedRole || currentUser?.role;
      if (role && !['admin', 'superadmin'].includes(role)) {
        return;
      }

      const res = await fetch('/api/change-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setDbChangeRequests(json.data.map(mapDBChangeRequestToChangeRequest));
          return;
        }
      }

      const { data, error } = await supabase
        .from('service_change_requests')
        .select('*, services(name, code)')
        .order('submitted_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setDbChangeRequests(data.map(mapDBChangeRequestToChangeRequest));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch change requests:', err);
    }
  }, [currentUser?.role]);

  // 5. Fetch Offices from authoritative Supabase tables
  const fetchOfficesFromAPI = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('offices').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        setDbOffices(data.map((o: any) => ({
          id: o.id,
          name: o.name,
          departmentId: o.department_id || 'dept-001',
          district: o.district || '',
          address: o.address || '',
          totalCounters: o.total_counters || 5,
          contactNumber: o.contact_number || '+91 79 23250000',
        })));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch offices:', err);
    }
  }, []);

  // 6. Fetch Employees from authoritative Supabase staff_profiles
  const fetchEmployeesFromAPI = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        try {
          const res = await fetch('/api/admin/employees', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
              setDbEmployees(
                json.data.map((e: any) => ({
                  id: e.id,
                  employeeIdCode: e.employee_id || e.id.slice(0, 8),
                  name: e.full_name || 'Counter Staff',
                  email: e.email || '',
                  phone: e.phone || '',
                  officeId: e.office_id || '',
                  officeName: e.offices?.name || 'District Office',
                  counterNumber: e.counter_number ? formatCounterDisplay(e.counter_number) : 'C-01',
                  isActive: e.status === 'ACTIVE' && e.is_active !== false,
                  assignedServiceIds: e.assigned_services || e.assigned_service_ids || [],
                  breakStartTime: e.break_start_time,
                  breakEndTime: e.break_end_time,
                  isOnBreak: e.on_break || false,
                }))
              );
              return;
            }
          }
        } catch (apiErr) {
          console.warn('[DataContext] /api/admin/employees fetch error, trying direct DB:', apiErr);
        }
      }

      const { data: staffList, error } = await supabase
        .from('staff_profiles')
        .select('*, offices(id, name)')
        .eq('role', 'employee');

      if (!error && Array.isArray(staffList) && staffList.length > 0) {
        const userIds = staffList.map((e: any) => e.user_id || e.id).filter(Boolean);
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const nameMap: Record<string, string> = {};
        const emailMap: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          nameMap[p.id] = p.full_name;
          emailMap[p.id] = p.email;
        });

        setDbEmployees(staffList.map((e: any) => {
          const uId = e.user_id || e.id;
          return {
            id: e.id,
            employeeIdCode: e.employee_id || e.id.slice(0, 8),
            name: nameMap[uId] || e.full_name || 'Counter Staff',
            email: emailMap[uId] || e.email || '',
            phone: e.phone || '',
            officeId: e.office_id || '',
            officeName: e.offices?.name || 'District Office',
            counterNumber: e.counter_number ? formatCounterDisplay(e.counter_number) : 'C-01',
            isActive: e.status === 'ACTIVE' && e.is_active !== false,
            assignedServiceIds: e.assigned_service_ids || [],
            breakStartTime: e.break_start_time,
            breakEndTime: e.break_end_time,
            isOnBreak: e.on_break || false,
          };
        }));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch employees:', err);
    }
  }, []);

  // 6. Fetch Audit Logs (Admin & Super Admin)
  const fetchAuditLogsFromAPI = useCallback(async () => {
    try {
      let logsData: any[] = [];
      const token = await getAuthToken();
      if (token) {
        try {
          const res = await fetch('/api/audit-logs', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              logsData = json.data;
            }
          }
        } catch (apiErr) {
          console.warn('[DataContext] /api/audit-logs fetch failed, fallback to direct Supabase:', apiErr);
        }
      }

      if (logsData.length === 0) {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
        if (!error && data) {
          logsData = data;
        }
      }

      if (logsData.length > 0) {
        setDbAuditLogs(logsData.map(mapDBAuditLogToAuditLog));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch audit logs:', err);
    }
  }, []);

  // Keep stable reference to latest auth state for callbacks and socket listeners
  const authRef = React.useRef({ isAuthenticated, role: currentUser?.role });
  useEffect(() => {
    authRef.current = { isAuthenticated, role: currentUser?.role };
  }, [isAuthenticated, currentUser?.role]);

  // 1. Initial loads whenever authentication state or user changes
  useEffect(() => {
    fetchServicesFromAPI();
    fetchOfficesFromAPI();
    fetchEmployeesFromAPI();

    if (isAuthenticated) {
      fetchEmployeesFromAPI();
      fetchApplicationsFromAPI();
      fetchQueueTokensFromAPI(currentUser?.role);
      if (currentUser && ['admin', 'superadmin'].includes(currentUser.role)) {
        fetchChangeRequestsFromAPI(currentUser.role);
        fetchAuditLogsFromAPI();
      }
    } else {
      setIsQueueTokensLoaded(true);
    }
  }, [
    isAuthenticated,
    currentUser?.role,
    currentUser?.id,
    fetchServicesFromAPI,
    fetchOfficesFromAPI,
    fetchEmployeesFromAPI,
    fetchApplicationsFromAPI,
    fetchQueueTokensFromAPI,
    fetchChangeRequestsFromAPI,
    fetchAuditLogsFromAPI,
  ]);

  // 2. Stable Supabase Realtime Channel (connects once, does not tear down on auth changes)
  useEffect(() => {
    const channel = supabase
      .channel('realtime_data_context_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServicesFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requirements' }, () => {
        fetchServicesFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        if (authRef.current.isAuthenticated) fetchApplicationsFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tokens' }, () => {
        if (authRef.current.isAuthenticated) fetchQueueTokensFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        if (authRef.current.isAuthenticated) fetchApplicationsFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_change_requests' }, () => {
        if (authRef.current.isAuthenticated) fetchChangeRequestsFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        if (authRef.current.isAuthenticated) fetchAuditLogsFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, () => {
        fetchEmployeesFromAPI();
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServicesFromAPI, fetchApplicationsFromAPI, fetchQueueTokensFromAPI, fetchChangeRequestsFromAPI, fetchAuditLogsFromAPI, fetchEmployeesFromAPI]);

  // 3. Fast polling fallback every 2000ms for continuous live data across all active pages & tabs
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServicesFromAPI();
      if (authRef.current.isAuthenticated) {
        fetchEmployeesFromAPI();
        fetchApplicationsFromAPI();
        fetchQueueTokensFromAPI(authRef.current.role);
        if (authRef.current.role && ['admin', 'superadmin'].includes(authRef.current.role)) {
          fetchChangeRequestsFromAPI(authRef.current.role);
          fetchAuditLogsFromAPI();
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchServicesFromAPI, fetchApplicationsFromAPI, fetchQueueTokensFromAPI, fetchChangeRequestsFromAPI, fetchAuditLogsFromAPI, fetchEmployeesFromAPI]);

  useEffect(() => {
    const unsub = mockRepository.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const allServices = dbServices;
  const services = currentUser?.role === 'superadmin' ? allServices : allServices.filter((s) => s.isActive !== false);
  const offices = dbOffices.length > 0 ? dbOffices : [];
  const employees = dbEmployees.length > 0 ? dbEmployees : [];
  const applications = dbApplications;
  const queueTokens = isQueueTokensLoaded ? dbQueueTokens : [];
  const changeRequests = dbChangeRequests;
  const auditLogs = dbAuditLogs;
  const notifications: NotificationItem[] = [];

  // SUBMIT APPLICATION
  const handleSubmitApplication = async (
    serviceId: string,
    serviceName: string,
    citizenId: string,
    citizenName: string,
    citizenPhone: string,
    docs: { requirementId: string; requirementName: string; fileName: string }[]
  ): Promise<Application> => {
    // 1. Local optimistic update
    const localApp = mockRepository.submitApplication(serviceId, serviceName, citizenId, citizenName, citizenPhone, docs);
    setDbApplications((prev) => [localApp, ...prev.filter((a) => a.id !== localApp.id)]);

    // 2. Sync to backend API
    try {
      const token = await getAuthToken();

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId,
          serviceName,
          documents: docs,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapped = mapDBAppToApplication(json.data);
          setDbApplications((prev) => [mapped, ...prev.filter((a) => a.id !== localApp.id && a.id !== mapped.id)]);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[DataContext] Application API sync warning:', err);
    }
    return localApp;
  };

  // ISSUE QUEUE TOKEN
  const handleIssueQueueToken = async (
    citizenId: string,
    citizenName: string,
    citizenPhone: string,
    serviceId: string,
    serviceName: string,
    options?: string | IssueTokenOptions
  ): Promise<QueueToken> => {
    // 1. Local optimistic update
    const localToken = mockRepository.issueQueueToken(
      citizenId,
      citizenName,
      citizenPhone,
      serviceId,
      serviceName,
      options
    );
    setDbQueueTokens((prev) => [...prev.filter((q) => q.id !== localToken.id), localToken]);
    // Also update applications so employee panel sees the booking immediately
    fetchApplicationsFromAPI();

    // 2. Sync to backend API
    try {
      const token = await getAuthToken();

      const officeId = typeof options === 'string' ? options : options?.officeId;
      const timeSlot = typeof options === 'object' ? options?.timeSlot : undefined;
      const slotDate = typeof options === 'object' ? options?.slotDate : undefined;
      const selectedState = typeof options === 'object' ? options?.selectedState : undefined;
      const selectedCity = typeof options === 'object' ? options?.selectedCity : undefined;
      const counterPath = typeof options === 'object' ? options?.counterPath : undefined;
      const documents = typeof options === 'object' ? options?.documents : undefined;

      const res = await fetch('/api/queue/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId,
          serviceName,
          officeId,
          timeSlot,
          slotDate,
          selectedState,
          selectedCity,
          counterPath,
          documents,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const dataWithDefaults = {
            ...json.data,
            time_slot: json.data.time_slot || timeSlot,
            slot_date: json.data.slot_date || slotDate,
            selected_state: json.data.selected_state || selectedState,
            selected_city: json.data.selected_city || selectedCity,
            counter_path: json.data.counter_path || counterPath,
          };
          const mapped = mapDBTokenToQueueToken(dataWithDefaults);
          setDbQueueTokens((prev) => [mapped, ...prev.filter((q) => q.id !== localToken.id && q.id !== mapped.id)]);
          setIsQueueTokensLoaded(true);
          // Refresh applications to pull any backend-generated application
          fetchApplicationsFromAPI();
          return mapped;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        setDbQueueTokens((prev) => prev.filter((q) => q.id !== localToken.id));
        const errorMessage = errJson?.error?.message || 'Failed to issue queue token.';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.warn('[DataContext] Queue token API sync warning:', err);
      setDbQueueTokens((prev) => prev.filter((q) => q.id !== localToken.id));
      throw err;
    }
    return localToken;
  };

  // ADVANCE TOKEN COUNTER STEP (e.g. Counter 1 -> Counter 3 -> Counter 5)
  const advanceTokenCounterStep = async (tokenId: string): Promise<void> => {
    mockRepository.advanceTokenCounterStep(tokenId);
    setDbQueueTokens((prev) =>
      prev.map((q) => {
        if (q.id !== tokenId) return q;
        const path = q.counterPath && q.counterPath.length > 0 ? q.counterPath : ['Counter 1', 'Counter 3', 'Counter 5'];
        const nextIdx = (q.currentCounterIndex ?? 0) + 1;
        if (nextIdx >= path.length) {
          return {
            ...q,
            currentCounterIndex: nextIdx - 1,
            status: 'COMPLETED' as const,
          };
        }
        const nextCounter = path[nextIdx].split(':')[0].trim();
        return {
          ...q,
          currentCounterIndex: nextIdx,
          counterNumber: nextCounter,
        };
      })
    );

    try {
      const token = await getAuthToken();

      await fetch(`/api/queue/tokens/${tokenId}/advance-counter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('[DataContext] Advance token counter step API warning:', err);
    }
  };

  // REBOOK EXPIRED TOKEN SLOT FOR SAME DAY
  const rebookExpiredTokenSlot = async (
    tokenId: string,
    newTimeSlot: string,
    newSlotDate?: string
  ): Promise<QueueToken | undefined> => {
    const rebooked = mockRepository.rebookExpiredTokenSlot(tokenId, newTimeSlot, newSlotDate);
    if (rebooked) {
      setDbQueueTokens((prev) => prev.map((q) => (q.id === tokenId ? rebooked : q)));
    }

    try {
      const token = await getAuthToken();

      const res = await fetch(`/api/queue/tokens/${tokenId}/rebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeSlot: newTimeSlot,
          slotDate: newSlotDate || new Date().toISOString().split('T')[0],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapped = mapDBTokenToQueueToken(json.data);
          setDbQueueTokens((prev) => prev.map((q) => (q.id === tokenId ? mapped : q)));
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[DataContext] Rebook token API warning:', err);
    }
    return rebooked;
  };

  // UPDATE EMPLOYEE BREAK SCHEDULE
  const updateEmployeeBreakSchedule = async (
    employeeId: string,
    breakStartTime: string,
    breakEndTime: string
  ): Promise<void> => {
    mockRepository.updateEmployeeBreakSchedule(employeeId, breakStartTime, breakEndTime);

    try {
      const token = await getAuthToken();

      await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          breakStartTime,
          breakEndTime,
        }),
      });
    } catch (err) {
      console.warn('[DataContext] Update employee break API warning:', err);
    }
  };

  // CANCEL QUEUE TOKEN
  const handleCancelQueueToken = async (tokenId: string): Promise<boolean> => {
    const existing = dbQueueTokens.find((q) => q.id === tokenId);
    if (existing && existing.status !== 'WAITING') {
      throw new Error('Tokens cannot be cancelled once an employee has called your token or processing has started.');
    }

    try {
      const token = await getAuthToken();

      const res = await fetch(`/api/queue/tokens/${tokenId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || 'Failed to cancel token.');
      }

      mockRepository.updateTokenStatus(tokenId, 'CANCELLED');
      setDbQueueTokens((prev) =>
        prev.map((q) => (q.id === tokenId ? { ...q, status: 'CANCELLED' as const } : q))
      );
      return true;
    } catch (err: any) {
      console.warn('[DataContext] Cancel token API warning:', err);
      // Direct Supabase fallback update if API route fails
      if (existing && existing.status === 'WAITING') {
        await supabase
          .from('queue_tokens')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', tokenId);

        mockRepository.updateTokenStatus(tokenId, 'CANCELLED');
        setDbQueueTokens((prev) =>
          prev.map((q) => (q.id === tokenId ? { ...q, status: 'CANCELLED' as const } : q))
        );
        return true;
      }
      throw err;
    }
  };

  // CALL NEXT TOKEN
  const handleCallNextToken = async (counterNumber?: string, serviceIds?: string[]): Promise<QueueToken | undefined> => {
    const targetCounter = counterNumber || 'C-04';

    try {
      const token = await getAuthToken();

      const res = await fetch('/api/queue/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          counterNumber: targetCounter,
          serviceIds: serviceIds && serviceIds.length > 0 ? serviceIds : undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapped = mapDBTokenToQueueToken(json.data);
          setDbQueueTokens((prev) =>
            prev.map((q) => {
              if (q.id === mapped.id) return mapped;
              if (q.counterNumber === targetCounter && q.status === 'IN_SERVICE') {
                return { ...q, status: 'COMPLETED' as const };
              }
              return q;
            })
          );
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[DataContext] Call next token API warning:', err);
    }

    // Fallback to local queue
    const localNext = mockRepository.callNextToken(targetCounter);
    if (localNext) {
      setDbQueueTokens((prev) =>
        prev.map((q) => (q.id === localNext.id ? localNext : q))
      );
    }
    return localNext;
  };

  // UPDATE TOKEN STATUS
  const handleUpdateTokenStatus = async (tokenId: string, status: QueueToken['status'], nextCounter?: string): Promise<void> => {
    mockRepository.updateTokenStatus(tokenId, status, nextCounter);
    setDbQueueTokens((prev) =>
      prev.map((q) => (q.id === tokenId ? { ...q, status, ...(nextCounter ? { nextCounter } : {}) } : q))
    );

    try {
      const token = await getAuthToken();

      await fetch(`/api/queue/tokens/${tokenId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, nextCounter }),
      });
    } catch (err) {
      console.warn('[DataContext] Update token status API warning:', err);
    }
  };

  // ROUTE TO NEXT TABLE (Requirement 2 Step 3 & 4)
  const handleRouteToNextTable = async (tokenId: string, nextCounter: string): Promise<void> => {
    const match = String(nextCounter).match(/C-?0*(\d+)/i) || String(nextCounter).match(/Counter\s*0*(\d+)/i);
    const normalizedNext = match ? (parseInt(match[1], 10) < 10 ? `C-0${parseInt(match[1], 10)}` : `C-${match[1]}`) : nextCounter;

    mockRepository.routeToNextTable(tokenId, normalizedNext);
    setDbQueueTokens((prev) =>
      prev.map((q) =>
        q.id === tokenId
          ? {
              ...q,
              status: 'WAITING',
              counterNumber: normalizedNext,
              nextCounter: undefined,
              currentCounterIndex: (q.currentCounterIndex ?? 0) + 1,
            }
          : q
      )
    );

    try {
      const token = await getAuthToken();

      const res = await fetch(`/api/queue/tokens/${tokenId}/next-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nextCounter: normalizedNext }),
      });

      if (!res.ok) {
        // Direct Supabase fallback
        try {
          await supabase.from('queue_tokens').update({
            status: 'WAITING',
            counter_number: normalizedNext,
            next_counter: null,
            called_at: null,
            service_started_at: null,
            updated_at: new Date().toISOString(),
          }).eq('id', tokenId);
        } catch {
          // If column not added, store in application remarks
          const currentToken = dbQueueTokens.find((q) => q.id === tokenId);
          if (currentToken?.applicationId) {
            await supabase.from('applications').update({
              remarks: `Direct to Table ${normalizedNext}`,
            }).eq('id', currentToken.applicationId);
          }
        }
      }
    } catch (err) {
      console.warn('[DataContext] routeToNextTable API warning:', err);
    }
  };

  // UPDATE APPLICATION STATUS
  const handleUpdateApplicationStatus = async (
    applicationId: string,
    status: Application['status'],
    note: string
  ): Promise<void> => {
    mockRepository.updateApplicationStatus(applicationId, status, note);
    setDbApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
    );

    try {
      const token = await getAuthToken();

      await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, remarks: note }),
      });
    } catch (err) {
      console.warn('[DataContext] Update application status API warning:', err);
    }
  };

  // UPDATE DOCUMENT STATUS
  const handleUpdateDocumentStatus = async (
    applicationId: string,
    docId: string,
    status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION',
    notes?: string
  ): Promise<void> => {
    mockRepository.updateDocumentStatus(applicationId, docId, status, notes);
    setDbApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            documents: app.documents.map((d) => (d.id === docId ? { ...d, status, notes } : d)),
          };
        }
        return app;
      })
    );

    try {
      const token = await getAuthToken();

      await fetch(`/api/applications/documents/${docId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes }),
      });
    } catch (err) {
      console.warn('[DataContext] Update document status API warning:', err);
    }
  };

  return (
    <DataContext.Provider
      value={{
        services,
        offices,
        employees,
        applications,
        queueTokens,
        isQueueTokensLoaded,
        changeRequests,
        auditLogs,
        notifications,
        refreshServices: fetchServicesFromAPI,
        refreshApplications: fetchApplicationsFromAPI,
        refreshQueueTokens: fetchQueueTokensFromAPI,
        refreshChangeRequests: fetchChangeRequestsFromAPI,
        refreshAuditLogs: fetchAuditLogsFromAPI,
        getServiceById: (id) => services.find((s) => s.id === id),
        getUserActiveToken: (userId) => {
          if (!isQueueTokensLoaded) return undefined;
          return queueTokens.find(
            (q) => q.citizenId === userId && (q.status === 'WAITING' || q.status === 'CALLED' || q.status === 'IN_SERVICE')
          );
        },
        getUserQueueTokens: (userId) => {
          if (!isQueueTokensLoaded) return [];
          return queueTokens.filter((q) => q.citizenId === userId);
        },
        getUserApplications: (userId) => {
          return applications.filter((a) => a.citizenId === userId);
        },
        issueQueueToken: handleIssueQueueToken,
        cancelQueueToken: handleCancelQueueToken,
        advanceTokenCounterStep,
        rebookExpiredTokenSlot,
        updateEmployeeBreakSchedule,
        callNextToken: handleCallNextToken,
        updateTokenStatus: handleUpdateTokenStatus,
        routeToNextTable: handleRouteToNextTable,
        submitApplication: handleSubmitApplication,
        updateDocumentStatus: handleUpdateDocumentStatus,
        updateApplicationStatus: handleUpdateApplicationStatus,
        createChangeRequest: (sId, sName, aId, aName, cDocs, nDoc, reason) =>
          mockRepository.createChangeRequest(sId, sName, aId, aName, cDocs, nDoc, reason),
        reviewChangeRequest: (crId, isApproved, reviewerName, reviewNote) =>
          mockRepository.reviewChangeRequest(crId, isApproved, reviewerName, reviewNote),
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
