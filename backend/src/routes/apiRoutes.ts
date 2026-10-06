import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  getServices,
  getServiceById,
  getOffices,
  getLocationAwareServices,
} from '../controllers/serviceController';
import {
  createApplication,
  getUserApplications,
  updateApplicationStatus,
} from '../controllers/applicationController';
import {
  generateToken,
  getLiveQueue,
  callNextToken,
} from '../controllers/queueController';
import {
  createChangeRequest,
  getChangeRequests,
  getAuditLogs,
  createEmployeeUser,
  getEmployeesList,
  setupOfficeConfig,
} from '../controllers/adminController';
import {
  reviewChangeRequest,
  getSystemAnalytics,
  createAdminUser,
  getAdminsList,
  updateAdminUser,
  deleteAdminUser,
  createGlobalService,
  updateGlobalService,
} from '../controllers/superAdminController';
import {
  submitComplaint,
  getComplaints,
} from '../controllers/complaintController';
import {
  getProfile,
  updateProfile,
} from '../controllers/profileController';

const router = Router();

// PUBLIC ROUTES
router.get('/services', getServices);
router.get('/services/location-aware', getLocationAwareServices);
router.get('/services/:id', getServiceById);
router.get('/offices', getOffices);

// AUTHENTICATED PROFILE ROUTES
router.get('/profile', authenticateToken, getProfile);
router.post('/profile/onboarding', authenticateToken, updateProfile);
router.put('/profile', authenticateToken, updateProfile);

// AUTHENTICATED CITIZEN ROUTES
router.post('/applications', authenticateToken, createApplication);
router.get('/applications', authenticateToken, getUserApplications);
router.post('/queue/token', authenticateToken, generateToken);
router.get('/queue/live', authenticateToken, getLiveQueue);
router.post('/complaints', authenticateToken, submitComplaint);
router.get('/complaints', authenticateToken, getComplaints);

// EMPLOYEE / OFFICER ROUTES
router.post('/queue/next', authenticateToken, requireRole('employee', 'admin', 'superadmin'), callNextToken);
router.patch('/applications/:id/status', authenticateToken, requireRole('employee', 'admin', 'superadmin'), updateApplicationStatus);

// ADMIN ROUTES
router.post('/admin/employees', authenticateToken, requireRole('admin', 'superadmin'), createEmployeeUser);
router.get('/admin/employees', authenticateToken, requireRole('admin', 'superadmin'), getEmployeesList);
router.post('/admin/office/setup', authenticateToken, requireRole('admin', 'superadmin'), setupOfficeConfig);
router.post('/change-requests', authenticateToken, requireRole('admin', 'superadmin'), createChangeRequest);
router.get('/change-requests', authenticateToken, requireRole('admin', 'superadmin'), getChangeRequests);
router.get('/audit-logs', authenticateToken, requireRole('admin', 'superadmin'), getAuditLogs);

// SUPER ADMIN ROUTES
router.post('/super-admin/create-admin', authenticateToken, requireRole('superadmin'), createAdminUser);
router.get('/super-admin/admins', authenticateToken, requireRole('superadmin'), getAdminsList);
router.patch('/super-admin/admins/:id', authenticateToken, requireRole('superadmin'), updateAdminUser);
router.delete('/super-admin/admins/:id', authenticateToken, requireRole('superadmin'), deleteAdminUser);
router.post('/super-admin/services', authenticateToken, requireRole('superadmin'), createGlobalService);
router.put('/super-admin/services/:id', authenticateToken, requireRole('superadmin'), updateGlobalService);
router.patch('/change-requests/:id/review', authenticateToken, requireRole('superadmin'), reviewChangeRequest);
router.get('/analytics/system', authenticateToken, requireRole('superadmin'), getSystemAnalytics);

export default router;
