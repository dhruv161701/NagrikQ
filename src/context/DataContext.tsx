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
import { useAuth } from './AuthContext';

interface DataContextType {
  services: Service[];
  offices: Office[];
  employees: Employee[];
  applications: Application[];
  queueTokens: QueueToken[];
  changeRequests: ChangeRequest[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  refreshServices: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  refreshQueueTokens: () => Promise<void>;
  refreshChangeRequests: () => Promise<void>;
  getServiceById: (id: string) => Service | undefined;
  getUserActiveToken: (userId: string) => QueueToken | undefined;
  getUserApplications: (userId: string) => Application[];
  issueQueueToken: (citizenId: string, citizenName: string, citizenPhone: string, serviceId: string, serviceName: string) => Promise<QueueToken> | QueueToken;
  cancelQueueToken: (tokenId: string) => void;
  callNextToken: (counterNumber?: string, serviceIds?: string[]) => Promise<QueueToken | undefined>;
  updateTokenStatus: (tokenId: string, status: QueueToken['status']) => Promise<void>;
  submitApplication: (serviceId: string, serviceName: string, citizenId: string, citizenName: string, citizenPhone: string, docs: { requirementId: string; requirementName: string; fileName: string }[]) => Promise<Application> | Application;
  updateDocumentStatus: (applicationId: string, docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION', notes?: string) => Promise<void>;
  updateApplicationStatus: (applicationId: string, status: Application['status'], note: string) => Promise<void>;
  createChangeRequest: (serviceId: string, serviceName: string, adminId: string, adminName: string, currentDocs: DocumentRequirement[], newDocName: string, reason: string) => ChangeRequest;
  reviewChangeRequest: (crId: string, isApproved: boolean, reviewerName: string, reviewNote?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const mapDBServiceToService = (item: any): Service => ({
  id: item.id,
  code: item.code || 'SRV-001',
  name: item.name,
  category: item.category || 'General',
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
      }))
    : (item.requiredDocuments || []),
  isActive: item.is_active !== undefined ? item.is_active : true,
  iconName: item.icon_name || item.iconName || 'FileText',
  eligibilityCriteria: item.eligibility_criteria || item.eligibilityCriteria || [],
});

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

const mapDBTokenToQueueToken = (row: any): QueueToken => ({
  id: row.id,
  tokenNumber: row.token_number || 'A-101',
  citizenId: row.user_id,
  citizenName: row.profiles?.full_name || 'Citizen User',
  citizenPhone: row.profiles?.phone || '+91 9876543210',
  serviceId: row.service_id,
  serviceName: row.services?.name || 'Government Service',
  officeId: row.office_id || 'off-001',
  officeName: row.offices?.name || 'Rajkot Jan Seva Kendra',
  counterNumber: row.counter_number || 'C-04',
  issuedAt: new Date(row.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  estimatedWaitMinutes: row.estimated_wait_minutes ?? 5,
  peopleAhead: row.people_ahead ?? 0,
  status: row.status || 'WAITING',
});

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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [, setTick] = useState(0);
  const [dbServices, setDbServices] = useState<Service[]>(() => mockRepository.getServices());
  const [dbApplications, setDbApplications] = useState<Application[]>(() => mockRepository.getApplications());
  const [dbQueueTokens, setDbQueueTokens] = useState<QueueToken[]>(() => mockRepository.getQueueTokens());
  const [dbChangeRequests, setDbChangeRequests] = useState<ChangeRequest[]>(() => mockRepository.getChangeRequests());

  // 1. Fetch Services (Public - no auth required)
  const fetchServicesFromAPI = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(mapDBServiceToService);
          setDbServices(mapped);
          return;
        }
      }

      const { data, error } = await supabase
        .from('services')
        .select('*, document_requirements(*)');

      if (!error && data && data.length > 0) {
        setDbServices(data.map(mapDBServiceToService));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch services:', err);
    }
  }, []);

  // 2. Fetch Applications (Requires authenticated session)
  const fetchApplicationsFromAPI = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        // Unauthenticated visitor: do not fire protected API endpoint
        return;
      }

      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(mapDBAppToApplication);
          setDbApplications(mapped);
          return;
        }
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, email, phone), documents(*)')
        .order('submitted_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setDbApplications(data.map(mapDBAppToApplication));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch applications:', err);
    }
  }, []);

  // 3. Fetch Queue Tokens (Protected - officer queue requires employee/admin/superadmin role)
  const fetchQueueTokensFromAPI = useCallback(async (forcedRole?: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        // Unauthenticated visitor: do not fire protected API endpoint
        return;
      }

      const role = forcedRole || currentUser?.role;
      // If citizen, read via Supabase direct query to avoid 403 Forbidden from officer endpoint
      if (role && !['employee', 'admin', 'superadmin'].includes(role)) {
        const { data, error } = await supabase
          .from('queue_tokens')
          .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          setDbQueueTokens(data.map(mapDBTokenToQueueToken));
        }
        return;
      }

      const res = await fetch('/api/queue/tokens', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(mapDBTokenToQueueToken);
          setDbQueueTokens(mapped);
          return;
        }
      }

      const { data, error } = await supabase
        .from('queue_tokens')
        .select('*, services(id, name, code, category), offices(id, name), profiles:user_id(id, full_name, phone)')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setDbQueueTokens(data.map(mapDBTokenToQueueToken));
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch queue tokens:', err);
    }
  }, [currentUser?.role]);

  // 4. Fetch Change Requests (Protected - requires admin or superadmin role)
  const fetchChangeRequestsFromAPI = useCallback(async (forcedRole?: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
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

      if (res.ok) {
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

  // Keep stable reference to latest auth state for callbacks and socket listeners
  const authRef = React.useRef({ isAuthenticated, role: currentUser?.role });
  useEffect(() => {
    authRef.current = { isAuthenticated, role: currentUser?.role };
  }, [isAuthenticated, currentUser?.role]);

  // 1. Initial loads whenever authentication state or user changes
  useEffect(() => {
    fetchServicesFromAPI();

    if (isAuthenticated) {
      fetchApplicationsFromAPI();
      if (currentUser && ['employee', 'admin', 'superadmin'].includes(currentUser.role)) {
        fetchQueueTokensFromAPI(currentUser.role);
      }
      if (currentUser && ['admin', 'superadmin'].includes(currentUser.role)) {
        fetchChangeRequestsFromAPI(currentUser.role);
      }
    }
  }, [
    isAuthenticated,
    currentUser?.role,
    fetchServicesFromAPI,
    fetchApplicationsFromAPI,
    fetchQueueTokensFromAPI,
    fetchChangeRequestsFromAPI,
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
      });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServicesFromAPI, fetchApplicationsFromAPI, fetchQueueTokensFromAPI, fetchChangeRequestsFromAPI]);

  // 3. Fast polling fallback every 2000ms for continuous live data across all active pages & tabs
  useEffect(() => {
    const interval = setInterval(() => {
      fetchServicesFromAPI();
      if (authRef.current.isAuthenticated) {
        fetchApplicationsFromAPI();
        if (authRef.current.role && ['employee', 'admin', 'superadmin'].includes(authRef.current.role)) {
          fetchQueueTokensFromAPI(authRef.current.role);
        }
        if (authRef.current.role && ['admin', 'superadmin'].includes(authRef.current.role)) {
          fetchChangeRequestsFromAPI(authRef.current.role);
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchServicesFromAPI, fetchApplicationsFromAPI, fetchQueueTokensFromAPI, fetchChangeRequestsFromAPI]);

  useEffect(() => {
    const unsub = mockRepository.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const services = dbServices.length > 0 ? dbServices : mockRepository.getServices();
  const offices = mockRepository.getOffices();
  const employees = mockRepository.getEmployees();
  const applications = dbApplications.length > 0 ? dbApplications : mockRepository.getApplications();
  const queueTokens = dbQueueTokens.length > 0 ? dbQueueTokens : mockRepository.getQueueTokens();
  const changeRequests = dbChangeRequests.length > 0 ? dbChangeRequests : mockRepository.getChangeRequests();
  const auditLogs = mockRepository.getAuditLogs();
  const notifications = mockRepository.getNotifications('');

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

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
    serviceName: string
  ): Promise<QueueToken> => {
    // 1. Local optimistic update
    const localToken = mockRepository.issueQueueToken(citizenId, citizenName, citizenPhone, serviceId, serviceName);
    setDbQueueTokens((prev) => [...prev.filter((q) => q.id !== localToken.id), localToken]);

    // 2. Sync to backend API
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/queue/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId,
          serviceName,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapped = mapDBTokenToQueueToken(json.data);
          setDbQueueTokens((prev) => [...prev.filter((q) => q.id !== localToken.id && q.id !== mapped.id), mapped]);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[DataContext] Queue token API sync warning:', err);
    }
    return localToken;
  };

  // CALL NEXT TOKEN
  const handleCallNextToken = async (counterNumber?: string, serviceIds?: string[]): Promise<QueueToken | undefined> => {
    const targetCounter = counterNumber || 'C-04';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

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
  const handleUpdateTokenStatus = async (tokenId: string, status: QueueToken['status']): Promise<void> => {
    mockRepository.updateTokenStatus(tokenId, status);
    setDbQueueTokens((prev) => prev.map((q) => (q.id === tokenId ? { ...q, status } : q)));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      await fetch(`/api/queue/tokens/${tokenId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.warn('[DataContext] Update token status API warning:', err);
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

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
        changeRequests,
        auditLogs,
        notifications,
        refreshServices: fetchServicesFromAPI,
        refreshApplications: fetchApplicationsFromAPI,
        refreshQueueTokens: fetchQueueTokensFromAPI,
        refreshChangeRequests: fetchChangeRequestsFromAPI,
        getServiceById: (id) => services.find((s) => s.id === id) || mockRepository.getServiceById(id),
        getUserActiveToken: (userId) =>
          queueTokens.find(
            (q) => q.citizenId === userId && (q.status === 'WAITING' || q.status === 'CALLED' || q.status === 'IN_SERVICE')
          ) || mockRepository.getUserActiveToken(userId),
        getUserApplications: (userId) => {
          const userApps = applications.filter((a) => a.citizenId === userId);
          return userApps.length > 0 ? userApps : mockRepository.getUserApplications(userId);
        },
        issueQueueToken: handleIssueQueueToken,
        cancelQueueToken: (tokenId) => mockRepository.cancelQueueToken(tokenId),
        callNextToken: handleCallNextToken,
        updateTokenStatus: handleUpdateTokenStatus,
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
