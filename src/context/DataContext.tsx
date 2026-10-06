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
  getServiceById: (id: string) => Service | undefined;
  getUserActiveToken: (userId: string) => QueueToken | undefined;
  getUserApplications: (userId: string) => Application[];
  issueQueueToken: (citizenId: string, citizenName: string, citizenPhone: string, serviceId: string, serviceName: string) => QueueToken;
  cancelQueueToken: (tokenId: string) => void;
  callNextToken: (counterNumber: string) => QueueToken | undefined;
  updateTokenStatus: (tokenId: string, status: QueueToken['status']) => void;
  submitApplication: (serviceId: string, serviceName: string, citizenId: string, citizenName: string, citizenPhone: string, docs: { requirementId: string; requirementName: string; fileName: string }[]) => Application;
  updateDocumentStatus: (applicationId: string, docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION', notes?: string) => void;
  updateApplicationStatus: (applicationId: string, status: Application['status'], note: string) => void;
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setTick] = useState(0);
  const [dbServices, setDbServices] = useState<Service[]>(() => mockRepository.getServices());

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

      // Supabase direct fallback
      const { data, error } = await supabase
        .from('services')
        .select('*, document_requirements(*)');

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapDBServiceToService);
        setDbServices(mapped);
      }
    } catch (err) {
      console.warn('[DataContext] Failed to fetch services from API:', err);
    }
  }, []);

  useEffect(() => {
    fetchServicesFromAPI();

    // Supabase Realtime for services & document requirements
    const channel = supabase
      .channel('realtime_services_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServicesFromAPI();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requirements' }, () => {
        fetchServicesFromAPI();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServicesFromAPI]);

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
  const applications = mockRepository.getApplications();
  const queueTokens = mockRepository.getQueueTokens();
  const changeRequests = mockRepository.getChangeRequests();
  const auditLogs = mockRepository.getAuditLogs();
  const notifications = mockRepository.getNotifications('');

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
        getServiceById: (id) => services.find((s) => s.id === id) || mockRepository.getServiceById(id),
        getUserActiveToken: (userId) => mockRepository.getUserActiveToken(userId),
        getUserApplications: (userId) => mockRepository.getUserApplications(userId),
        issueQueueToken: (cId, cName, cPhone, sId, sName) => mockRepository.issueQueueToken(cId, cName, cPhone, sId, sName),
        cancelQueueToken: (tokenId) => mockRepository.cancelQueueToken(tokenId),
        callNextToken: (counterNumber) => mockRepository.callNextToken(counterNumber),
        updateTokenStatus: (tokenId, status) => mockRepository.updateTokenStatus(tokenId, status),
        submitApplication: (sId, sName, cId, cName, cPhone, docs) => mockRepository.submitApplication(sId, sName, cId, cName, cPhone, docs),
        updateDocumentStatus: (appId, docId, status, notes) => mockRepository.updateDocumentStatus(appId, docId, status, notes),
        updateApplicationStatus: (appId, status, note) => mockRepository.updateApplicationStatus(appId, status, note),
        createChangeRequest: (sId, sName, aId, aName, cDocs, nDoc, reason) => mockRepository.createChangeRequest(sId, sName, aId, aName, cDocs, nDoc, reason),
        reviewChangeRequest: (crId, isApproved, reviewerName, reviewNote) => mockRepository.reviewChangeRequest(crId, isApproved, reviewerName, reviewNote),
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
