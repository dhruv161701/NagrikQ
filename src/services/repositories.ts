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
import {
  INITIAL_SERVICES,
  INITIAL_OFFICES,
  INITIAL_EMPLOYEES,
  INITIAL_APPLICATIONS,
  INITIAL_QUEUE_TOKENS,
  INITIAL_CHANGE_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mockData';

// Internal Mock Memory Storage
let servicesState: Service[] = [...INITIAL_SERVICES];
let officesState: Office[] = [...INITIAL_OFFICES];
let employeesState: Employee[] = [...INITIAL_EMPLOYEES];
let applicationsState: Application[] = [...INITIAL_APPLICATIONS];
let queueState: QueueToken[] = [...INITIAL_QUEUE_TOKENS];
let changeRequestsState: ChangeRequest[] = [...INITIAL_CHANGE_REQUESTS];
let auditLogsState: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let notificationsState: NotificationItem[] = [...INITIAL_NOTIFICATIONS];

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const mockRepository = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getServices(): Service[] {
    return [...servicesState];
  },
  getServiceById(id: string): Service | undefined {
    return servicesState.find((s) => s.id === id);
  },
  addService(service: Service) {
    servicesState = [service, ...servicesState];
    notify();
  },
  updateService(service: Service) {
    servicesState = servicesState.map((s) => (s.id === service.id ? service : s));
    notify();
  },

  getOffices(): Office[] {
    return [...officesState];
  },

  getEmployees(): Employee[] {
    return [...employeesState];
  },
  addEmployee(emp: Employee) {
    employeesState = [emp, ...employeesState];
    notify();
  },
  updateEmployee(emp: Employee) {
    employeesState = employeesState.map((e) => (e.id === emp.id ? emp : e));
    notify();
  },

  getQueueTokens(): QueueToken[] {
    return [...queueState];
  },
  getUserActiveToken(userId: string): QueueToken | undefined {
    return queueState.find(
      (q) => q.citizenId === userId && (q.status === 'WAITING' || q.status === 'CALLED' || q.status === 'IN_SERVICE')
    );
  },
  issueQueueToken(citizenId: string, citizenName: string, citizenPhone: string, serviceId: string, serviceName: string): QueueToken {
    const nextNum = 100 + queueState.length + 1;
    const tokenNum = `A${nextNum}`;
    const waitingTokens = queueState.filter((q) => q.status === 'WAITING');
    const newToken: QueueToken = {
      id: `q-${Date.now()}`,
      tokenNumber: tokenNum,
      citizenId,
      citizenName,
      citizenPhone,
      serviceId,
      serviceName,
      officeId: 'off-001',
      officeName: 'Rajkot Mamlatdar Office (West)',
      counterNumber: 'C-04',
      issuedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedWaitMinutes: (waitingTokens.length + 1) * 4,
      peopleAhead: waitingTokens.length,
      status: 'WAITING',
    };
    queueState = [...queueState, newToken];
    
    this.addAuditLog(citizenId, citizenName, 'citizen', 'GENERATE_QUEUE_TOKEN', serviceName, `Token ${tokenNum} generated for ${serviceName}`);
    notify();
    return newToken;
  },
  cancelQueueToken(tokenId: string) {
    queueState = queueState.map((q) => (q.id === tokenId ? { ...q, status: 'CANCELLED' as const } : q));
    notify();
  },
  callNextToken(counterNumber: string): QueueToken | undefined {
    queueState = queueState.map((q) => (q.counterNumber === counterNumber && q.status === 'IN_SERVICE' ? { ...q, status: 'COMPLETED' as const } : q));
    
    const nextWaiting = queueState.find((q) => q.counterNumber === counterNumber && q.status === 'WAITING');
    if (nextWaiting) {
      queueState = queueState.map((q) => (q.id === nextWaiting.id ? { ...q, status: 'IN_SERVICE' as const, peopleAhead: 0, estimatedWaitMinutes: 0 } : q));
      
      let currentAhead = 0;
      queueState = queueState.map((q) => {
        if (q.counterNumber === counterNumber && q.status === 'WAITING') {
          const updated = { ...q, peopleAhead: currentAhead, estimatedWaitMinutes: currentAhead * 4 };
          currentAhead++;
          return updated;
        }
        return q;
      });
      notify();
      return queueState.find((q) => q.id === nextWaiting.id);
    }
    notify();
    return undefined;
  },
  updateTokenStatus(tokenId: string, status: QueueToken['status']) {
    queueState = queueState.map((q) => (q.id === tokenId ? { ...q, status } : q));
    notify();
  },

  getApplications(): Application[] {
    return [...applicationsState];
  },
  getUserApplications(userId: string): Application[] {
    return applicationsState.filter((a) => a.citizenId === userId);
  },
  submitApplication(serviceId: string, serviceName: string, citizenId: string, citizenName: string, citizenPhone: string, docs: { requirementId: string; requirementName: string; fileName: string }[]): Application {
    const appNum = `NGK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newApp: Application = {
      id: `app-${Date.now()}`,
      applicationNumber: appNum,
      serviceId,
      serviceName,
      citizenId,
      citizenName,
      citizenPhone,
      submittedAt: new Date().toLocaleString(),
      status: 'SUBMITTED',
      officeId: 'off-001',
      officeName: 'Rajkot Mamlatdar Office (West)',
      documents: docs.map((d, i) => ({
        id: `adoc-${Date.now()}-${i}`,
        requirementId: d.requirementId,
        requirementName: d.requirementName,
        fileUrl: '#',
        fileName: d.fileName,
        status: 'PENDING',
      })),
      timeline: [
        { status: 'SUBMITTED', timestamp: new Date().toLocaleString(), note: 'Application submitted online.' },
      ],
    };
    applicationsState = [newApp, ...applicationsState];
    notify();
    return newApp;
  },
  updateDocumentStatus(applicationId: string, docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION', notes?: string) {
    applicationsState = applicationsState.map((app) => {
      if (app.id === applicationId) {
        const updatedDocs = app.documents.map((d) => (d.id === docId ? { ...d, status, notes } : d));
        return { ...app, documents: updatedDocs };
      }
      return app;
    });
    notify();
  },
  updateApplicationStatus(applicationId: string, status: Application['status'], note: string) {
    applicationsState = applicationsState.map((app) => {
      if (app.id === applicationId) {
        return {
          ...app,
          status,
          timeline: [...app.timeline, { status, timestamp: new Date().toLocaleString(), note }],
        };
      }
      return app;
    });
    notify();
  },

  getChangeRequests(): ChangeRequest[] {
    return [...changeRequestsState];
  },
  createChangeRequest(serviceId: string, serviceName: string, adminId: string, adminName: string, currentDocs: DocumentRequirement[], newDocName: string, reason: string): ChangeRequest {
    const currentDocNames = currentDocs.map((d) => d.name);
    const newReq: ChangeRequest = {
      id: `cr-${Date.now()}`,
      requestNumber: `CR-2026-${Math.floor(100 + Math.random() * 900)}`,
      serviceId,
      serviceName,
      requestedByAdminId: adminId,
      requestedByAdminName: adminName,
      officeName: 'Rajkot Mamlatdar Office',
      currentDocumentIds: currentDocs.map((d) => d.id),
      currentDocumentNames: currentDocNames,
      proposedDocumentIds: [...currentDocs.map((d) => d.id), `doc-req-new-${Date.now()}`],
      proposedDocumentNames: [...currentDocNames, newDocName],
      addedDocumentName: newDocName,
      reason,
      status: 'PENDING',
      submittedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    changeRequestsState = [newReq, ...changeRequestsState];

    this.addAuditLog(adminId, adminName, 'admin', 'CREATE_CHANGE_REQUEST', serviceName, `Created Change Request ${newReq.requestNumber} to add "${newDocName}" to ${serviceName}`);
    notify();
    return newReq;
  },
  reviewChangeRequest(crId: string, isApproved: boolean, reviewerName: string, reviewNote?: string) {
    const cr = changeRequestsState.find((c) => c.id === crId);
    if (!cr) return;

    const newStatus = isApproved ? 'APPROVED' : 'REJECTED';
    changeRequestsState = changeRequestsState.map((c) =>
      c.id === crId
        ? {
            ...c,
            status: newStatus,
            reviewedAt: new Date().toLocaleString(),
            reviewedBySuperAdminName: reviewerName,
            reviewNote,
          }
        : c
    );

    if (isApproved) {
      const targetService = servicesState.find((s) => s.id === cr.serviceId);
      if (targetService) {
        const newDoc: DocumentRequirement = {
          id: `doc-req-approved-${Date.now()}`,
          name: cr.addedDocumentName,
          description: 'Added per approved administrative requirement change.',
          isRequired: true,
          fileTypes: ['PDF', 'JPG'],
          maxSizeMb: 5,
        };
        const updatedService: Service = {
          ...targetService,
          requiredDocuments: [...targetService.requiredDocuments, newDoc],
        };
        servicesState = servicesState.map((s) => (s.id === targetService.id ? updatedService : s));
      }
    }

    this.addAuditLog(
      'usr-sup-401',
      reviewerName,
      'superadmin',
      isApproved ? 'APPROVE_CHANGE_REQUEST' : 'REJECT_CHANGE_REQUEST',
      cr.serviceName,
      `${isApproved ? 'Approved' : 'Rejected'} Change Request ${cr.requestNumber} for ${cr.serviceName}`
    );
    notify();
  },

  getAuditLogs(): AuditLog[] {
    return [...auditLogsState];
  },
  addAuditLog(userId: string, userName: string, userRole: AuditLog['userRole'], action: string, entity: string, details: string) {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId,
      userName,
      userRole,
      action,
      entity,
      details,
      timestamp: new Date().toLocaleString(),
      ipAddress: '10.20.4.' + Math.floor(Math.random() * 200),
    };
    auditLogsState = [newLog, ...auditLogsState];
    notify();
  },

  getNotifications(userId: string): NotificationItem[] {
    return notificationsState.filter((n) => n.userId === userId || n.userId === 'all');
  },
};
