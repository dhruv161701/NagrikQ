import type {
  Service,
  Office,
  Employee,
  Application,
  QueueToken,
  ChangeRequest,
  AuditLog,
  NotificationItem,
  User,
} from '../types';

export const MOCK_USERS: Record<string, User> = {
  citizen: {
    id: '4e5ece3a-72cc-43e1-8ce6-b976acec59b9',
    name: 'Citizen Applicant',
    email: 'citizen@nagrikq.org',
    phone: '+91 9876543210',
    role: 'citizen',
    state: 'Gujarat',
    district: 'Rajkot',
    onboardingCompleted: true,
    preferredLanguage: 'en',
    preferredUIMode: 'modern',
  },
  employee: {
    id: '8a0831d3-0956-4d38-8bec-dd1984a07b92',
    name: 'Counter Officer (C-04)',
    email: 'officer@nagrikq.org',
    phone: '+91 9876543210',
    role: 'employee',
    state: 'Gujarat',
    district: 'Rajkot',
    onboardingCompleted: true,
    preferredLanguage: 'en',
    preferredUIMode: 'modern',
  },
  admin: {
    id: '46943c02-5558-4c37-a64f-05c3e412ec1a',
    name: 'Mamlatdar Office Admin',
    email: 'admin@nagrikq.org',
    phone: '+91 9876543210',
    role: 'admin',
    state: 'Gujarat',
    district: 'Rajkot',
    onboardingCompleted: true,
    preferredLanguage: 'en',
    preferredUIMode: 'modern',
  },
  superadmin: {
    id: '8b673c97-2222-4182-a012-edf78a090c10',
    name: 'State Super Administrator',
    email: 'superadmin@nagrikq.org',
    phone: '+91 9876543210',
    role: 'superadmin',
    state: 'Gujarat',
    district: 'Gandhinagar',
    onboardingCompleted: true,
    preferredLanguage: 'en',
    preferredUIMode: 'modern',
  },
};

export const INITIAL_SERVICES: Service[] = [];
export const INITIAL_OFFICES: Office[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_APPLICATIONS: Application[] = [];
export const INITIAL_QUEUE_TOKENS: QueueToken[] = [];
export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
