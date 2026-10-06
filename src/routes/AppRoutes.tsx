import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { UserLayout } from '../layouts/UserLayout';
import { EmployeeLayout } from '../layouts/EmployeeLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { SuperAdminLayout } from '../layouts/SuperAdminLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { ServiceDiscoveryPage } from '../pages/public/ServiceDiscoveryPage';
import { ServiceDetailPage } from '../pages/public/ServiceDetailPage';
import { LoginPage } from '../pages/public/LoginPage';
import { StaffLoginPage } from '../pages/public/StaffLoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage';

// Onboarding Pages
import { LanguageSelectionPage } from '../pages/onboarding/LanguageSelectionPage';
import { DateOfBirthPage } from '../pages/onboarding/DateOfBirthPage';
import { ModeRecommendationPage } from '../pages/onboarding/ModeRecommendationPage';

// Citizen Pages
import { UserDashboardPage } from '../pages/user/UserDashboardPage';
import { UserServicesPage } from '../pages/user/UserServicesPage';
import { UserApplicationsPage } from '../pages/user/UserApplicationsPage';
import { UserQueuePage } from '../pages/user/UserQueuePage';
import { UserDocumentsPage } from '../pages/user/UserDocumentsPage';
import { UserAssistantPage } from '../pages/user/UserAssistantPage';
import { UserSettingsPage } from '../pages/user/UserSettingsPage';

// Employee Pages
import { EmployeeDashboardPage } from '../pages/employee/EmployeeDashboardPage';
import { EmployeeQueuePage } from '../pages/employee/EmployeeQueuePage';
import { EmployeeApplicationsPage } from '../pages/employee/EmployeeApplicationsPage';
import { EmployeeSettingsPage } from '../pages/employee/EmployeeSettingsPage';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminEmployeesPage } from '../pages/admin/AdminEmployeesPage';
import { AdminServicesPage } from '../pages/admin/AdminServicesPage';
import { AdminDocRequirementsPage } from '../pages/admin/AdminDocRequirementsPage';
import { AdminChangeRequestsPage } from '../pages/admin/AdminChangeRequestsPage';
import { AdminReportsPage } from '../pages/admin/AdminReportsPage';
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage';

// Super Admin Pages
import { SuperAdminDashboardPage } from '../pages/superadmin/SuperAdminDashboardPage';
import { SuperAdminServicesPage } from '../pages/superadmin/SuperAdminServicesPage';
import { SuperAdminChangeRequestsPage } from '../pages/superadmin/SuperAdminChangeRequestsPage';
import { SuperAdminAdminsPage } from '../pages/superadmin/SuperAdminAdminsPage';
import { SuperAdminOfficesPage } from '../pages/superadmin/SuperAdminOfficesPage';
import { SuperAdminAuditLogsPage } from '../pages/superadmin/SuperAdminAuditLogsPage';
import { SuperAdminSettingsPage } from '../pages/superadmin/SuperAdminSettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/services" element={<ServiceDiscoveryPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff-login" element={<StaffLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* ADAPTIVE ONBOARDING ROUTES */}
      <Route
        path="/onboarding/language"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <LanguageSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/dob"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <DateOfBirthPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/mode"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <ModeRecommendationPage />
          </ProtectedRoute>
        }
      />

      {/* CITIZEN / USER PANEL */}
      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/user/dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboardPage />} />
        <Route path="services" element={<UserServicesPage />} />
        <Route path="applications" element={<UserApplicationsPage />} />
        <Route path="queue" element={<UserQueuePage />} />
        <Route path="documents" element={<UserDocumentsPage />} />
        <Route path="assistant" element={<UserAssistantPage />} />
        <Route path="settings" element={<UserSettingsPage />} />
      </Route>

      {/* EMPLOYEE / OFFICER PANEL */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboardPage />} />
        <Route path="queue" element={<EmployeeQueuePage />} />
        <Route path="applications" element={<EmployeeApplicationsPage />} />
        <Route path="settings" element={<EmployeeSettingsPage />} />
      </Route>

      {/* OFFICE ADMIN PANEL */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="employees" element={<AdminEmployeesPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="document-requirements" element={<AdminDocRequirementsPage />} />
        <Route path="change-requests" element={<AdminChangeRequestsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* SUPER ADMIN PANEL */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="services" element={<SuperAdminServicesPage />} />
        <Route path="change-requests" element={<SuperAdminChangeRequestsPage />} />
        <Route path="admins" element={<SuperAdminAdminsPage />} />
        <Route path="offices" element={<SuperAdminOfficesPage />} />
        <Route path="audit-logs" element={<SuperAdminAuditLogsPage />} />
        <Route path="settings" element={<SuperAdminSettingsPage />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
