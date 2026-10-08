import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, currentUser, activeRole, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-neutral-200)',
            borderTopColor: 'var(--color-primary-700)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
          Authenticating NagrikQ Seva Account...
        </span>
      </div>
    );
  }

  // 1. Unauthenticated check -> Redirect to /login with redirect URL
  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 2. Onboarding check for citizen -> If incomplete, redirect to /onboarding/language
  const isOnboarded =
    currentUser.onboardingCompleted === true ||
    (currentUser.id && localStorage.getItem(`nagrikq_onboarding_${currentUser.id}`) === 'true') ||
    (currentUser.email && localStorage.getItem(`nagrikq_onboarding_${currentUser.email}`) === 'true');

  if (currentUser.role === 'citizen' && !isOnboarded) {
    if (!location.pathname.startsWith('/onboarding')) {
      return <Navigate to="/onboarding/language" replace />;
    }
  }

  // 3. Role authorization check -> 403 Access Denied screen if role is unauthorized
  if (!allowedRoles.includes(activeRole)) {
    const defaultDashboard =
      activeRole === 'employee'
        ? '/employee/dashboard'
        : activeRole === 'admin'
        ? '/admin/dashboard'
        : activeRole === 'superadmin'
        ? '/super-admin/dashboard'
        : '/user/dashboard';

    return (
      <div
        style={{
          maxWidth: '640px',
          margin: '80px auto',
          textAlign: 'center',
          padding: '40px 24px',
          backgroundColor: 'var(--color-white)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-neutral-200)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-error-700)', margin: 0 }}>
          403 — Access Denied / Unauthorized
        </h2>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '12px', fontSize: '1rem', lineHeight: 1.5 }}>
          Your account role (<strong>{activeRole}</strong>) does not have permission to access this government portal section.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Button variant="primary" onClick={() => navigate(defaultDashboard)}>
            Return to My Dashboard →
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
