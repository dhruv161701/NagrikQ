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

export const MOCK_USERS: Record<string, User> = {};

export const INITIAL_SERVICES: Service[] = [];
export const INITIAL_OFFICES: Office[] = [];
export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_APPLICATIONS: Application[] = [];
export const INITIAL_QUEUE_TOKENS: QueueToken[] = [];
export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
