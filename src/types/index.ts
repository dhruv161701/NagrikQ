export type UserRole = 'citizen' | 'employee' | 'admin' | 'superadmin';

export type UIMode = 'modern' | 'simple';

export type LanguageCode = 'en' | 'gu' | 'hi';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  dob?: string;
  age?: number;
  preferredLanguage?: LanguageCode;
  preferredUIMode?: UIMode;
  state?: string;
  district?: string;
  onboardingCompleted?: boolean;
}

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  fileTypes?: string[];
  maxSizeMb?: number;
  validityPeriod?: string;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  processingTimeDays: number;
  feeAmount: number;
  departmentId: string;
  departmentName: string;
  requiredDocuments: DocumentRequirement[];
  isActive: boolean;
  iconName: string;
  eligibilityCriteria?: string[];
  applicableStates?: string[];
  applicableCities?: string[];
  slotCapacity?: number;
  counterPath?: string[];
  documentValidity?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  state: string;
}

export interface Office {
  id: string;
  name: string;
  departmentId: string;
  district: string;
  address: string;
  totalCounters: number;
  contactNumber: string;
}

export interface Employee {
  id: string;
  employeeIdCode: string;
  name: string;
  email: string;
  phone: string;
  officeId: string;
  officeName: string;
  counterNumber: string;
  isActive: boolean;
  assignedServiceIds: string[];
  breakStartTime?: string;
  breakEndTime?: string;
  isOnBreak?: boolean;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type DocumentVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION';

export interface ApplicationDocument {
  id: string;
  requirementId: string;
  requirementName: string;
  fileUrl: string;
  fileName: string;
  status: DocumentVerificationStatus;
  notes?: string;
}

export interface Application {
  id: string;
  applicationNumber: string;
  serviceId: string;
  serviceName: string;
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  submittedAt: string;
  status: ApplicationStatus;
  officeId: string;
  officeName: string;
  documents: ApplicationDocument[];
  timeline: {
    status: ApplicationStatus | string;
    timestamp: string;
    note: string;
  }[];
  notes?: string;
}

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'EXPIRED';

export interface QueueToken {
  id: string;
  tokenNumber: string; // e.g. A104
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  serviceId: string;
  serviceName: string;
  officeId: string;
  officeName: string;
  counterNumber?: string;
  issuedAt: string;
  estimatedWaitMinutes: number;
  peopleAhead: number;
  status: QueueStatus;
  applicationId?: string;
  timeSlot?: string; // e.g. '01:30 PM - 02:00 PM'
  slotDate?: string; // e.g. '2026-10-07'
  selectedState?: string; // e.g. 'Gujarat'
  selectedCity?: string; // e.g. 'Rajkot'
  counterPath?: string[]; // e.g. ['Counter 1', 'Counter 3', 'Counter 5']
  currentCounterIndex?: number;
  isLate?: boolean;
  gracePeriodMinutes?: number;
  submittedDocuments?: { requirementName: string; fileName: string; status: string; fileUrl?: string; issueDate?: string; expiryDate?: string }[];
}

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChangeRequest {
  id: string;
  requestNumber: string;
  serviceId: string;
  serviceName: string;
  requestedByAdminId: string;
  requestedByAdminName: string;
  officeName: string;
  currentDocumentIds: string[];
  currentDocumentNames: string[];
  proposedDocumentIds: string[];
  proposedDocumentNames: string[];
  addedDocumentName: string;
  reason: string;
  status: ChangeRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBySuperAdminName?: string;
  reviewNote?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. 'CREATE_CHANGE_REQUEST', 'APPROVE_CHANGE_REQUEST', 'CALL_NEXT_QUEUE'
  entity: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'queue' | 'application' | 'system';
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
}
