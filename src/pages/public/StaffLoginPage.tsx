import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  Building,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

type StaffRole = 'employee' | 'admin' | 'superadmin';

export const StaffLoginPage: React.FC = () => {
  const { loginWithEmail, isLoading, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect');
  const initialRole = (queryParams.get('role') || queryParams.get('portal')) as StaffRole;

  const [activeRole, setActiveRole] = useState<StaffRole>(
    ['employee', 'admin', 'superadmin'].includes(initialRole) ? initialRole : 'employee'
  );

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot Password Modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setResetErrorMsg('Please enter a valid official email address.');
      return;
    }
    setForgotSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setResetErrorMsg(error.message);
      } else {
        setResetSuccessMsg(`Password reset link sent to ${forgotEmail}. Please check your official inbox.`);
      }
    } catch (err: any) {
      setResetErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  // Sync tab if query param changes
  useEffect(() => {
    const r = (queryParams.get('role') || queryParams.get('portal')) as StaffRole;
    if (r && ['employee', 'admin', 'superadmin'].includes(r)) {
      setActiveRole(r);
    }
  }, [location.search]);

  // Auto-redirect authenticated staff member
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
        return;
      }

      const defaultDashboard =
        currentUser.role === 'employee'
          ? '/employee/dashboard'
          : currentUser.role === 'admin'
          ? '/admin/dashboard'
          : currentUser.role === 'superadmin'
          ? '/super-admin/dashboard'
          : '/user/dashboard';

      navigate(defaultDashboard, { replace: true });
    }
  }, [isLoading, isAuthenticated, currentUser, redirectPath, navigate]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await loginWithEmail(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        if (redirectPath) {
          navigate(redirectPath);
        } else {
          // Read actual role from Supabase session metadata
          const { data } = await supabase.auth.getSession();
          const userRole = data?.session?.user?.user_metadata?.role || activeRole;
          const target =
            userRole === 'employee'
              ? '/employee/dashboard'
              : userRole === 'admin'
              ? '/admin/dashboard'
              : userRole === 'superadmin'
              ? '/super-admin/dashboard'
              : '/user/dashboard';
          navigate(target);
        }
      }
    } catch {
      setError('An error occurred during sign in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--color-neutral-900)',
        backgroundImage: 'radial-gradient(circle at top right, rgba(37, 99, 235, 0.15), transparent 40%)',
      }}
    >
      <div
        style={{
          maxWidth: '1080px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '40px',
          alignItems: 'center',
        }}
      >
        {/* Left Side Government IDP Branding Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-accent-600)',
                color: 'var(--color-neutral-950)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.7rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              Q
            </div>
            <div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
                Nagrik<span style={{ color: 'var(--color-accent-500)' }}>Q</span> Staff IDP
              </span>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-400)', fontWeight: 600 }}>
                Government Identity Provider & Access Management
              </div>
            </div>
          </div>

          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: 'var(--color-accent-400)',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '14px',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              <ShieldCheck size={14} /> RESTRICTED GOVERNMENT STAFF PORTAL
            </span>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'white', lineHeight: 1.25 }}>
              Official Administration & Officer Portal
            </h1>
            <p style={{ color: 'var(--color-neutral-300)', fontSize: '1.05rem', marginTop: '12px', lineHeight: 1.6 }}>
              Secure authentication gateway for government officers, office administrators, and system authorities.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent-400)' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>No Public Registration</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-neutral-400)' }}>
                  Staff accounts are created strictly by authorized Office Admins & Super Admins.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-accent-400)' }}>
                <Building size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>Scope & Counter Scoped Access</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-neutral-400)' }}>
                  Access permissions are strictly governed by your assigned department & office counter.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Staff Login Card */}
        <Card style={{ padding: '32px 28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', backgroundColor: 'var(--color-white)' }}>
          {/* Role Selection Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              backgroundColor: 'var(--color-neutral-100)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => { setActiveRole('employee'); setError(''); }}
              style={{
                padding: '10px 4px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeRole === 'employee' ? 'var(--color-primary-900)' : 'transparent',
                color: activeRole === 'employee' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: activeRole === 'employee' ? 700 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeRole === 'employee' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <UserCheck size={14} /> Officer
            </button>
            <button
              type="button"
              onClick={() => { setActiveRole('admin'); setError(''); }}
              style={{
                padding: '10px 4px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeRole === 'admin' ? 'var(--color-primary-900)' : 'transparent',
                color: activeRole === 'admin' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: activeRole === 'admin' ? 700 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeRole === 'admin' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={14} /> Office Admin
            </button>
            <button
              type="button"
              onClick={() => { setActiveRole('superadmin'); setError(''); }}
              style={{
                padding: '10px 4px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeRole === 'superadmin' ? 'var(--color-primary-900)' : 'transparent',
                color: activeRole === 'superadmin' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: activeRole === 'superadmin' ? 700 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeRole === 'superadmin' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Lock size={14} /> Super Admin
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
              {activeRole === 'employee' && 'Officer / Employee Portal Login'}
              {activeRole === 'admin' && 'Department / Office Admin Portal'}
              {activeRole === 'superadmin' && 'State Super Admin Gateway'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
              {activeRole === 'employee' && 'Enter your official government ID and assigned password'}
              {activeRole === 'admin' && 'Sign in to manage office staff, counters, and services'}
              {activeRole === 'superadmin' && 'State system authority & global configuration portal'}
            </p>
          </div>

          {/* Security Notice Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--color-primary-900)',
              marginBottom: '20px',
              lineHeight: 1.45,
            }}
          >
            <ShieldCheck size={18} style={{ color: 'var(--color-primary-700)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Government IDP Security Notice:</strong> Official accounts are created exclusively by higher administrative authorities. Public registration is disabled.
            </div>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-error-100)',
                color: 'var(--color-error-700)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Official Government Email / ID
              </label>
              <Input
                type="email"
                placeholder={
                  activeRole === 'employee'
                    ? 'officer@nagrikq.org'
                    : activeRole === 'admin'
                    ? 'admin@nagrikq.org'
                    : 'superadmin@nagrikq.org'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setResetSuccessMsg('');
                    setResetErrorMsg('');
                    setIsForgotModalOpen(true);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading || isSubmitting}
              icon={<ArrowRight size={18} />}
              style={{ backgroundColor: 'var(--color-primary-900)', marginTop: '6px' }}
            >
              {isSubmitting
                ? 'Authenticating...'
                : `Sign In to ${activeRole === 'employee' ? 'Officer Portal' : activeRole === 'admin' ? 'Admin Portal' : 'Super Admin Portal'}`}
            </Button>
          </form>
        </Card>
      </div>

      {/* Staff Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title={`Reset Password — ${activeRole === 'employee' ? 'Officer' : activeRole === 'admin' ? 'Office Admin' : 'Super Admin'}`}
        maxWidth="500px"
      >
        <form onSubmit={handleSendResetEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', margin: 0, lineHeight: 1.5 }}>
            Enter your official government email address below. We will send a secure verification link to reset your password.
          </p>

          {resetSuccessMsg && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-success-50)', color: 'var(--color-success-900)', border: '1px solid var(--color-success-300)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> {resetSuccessMsg}
            </div>
          )}

          {resetErrorMsg && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger-50)', color: 'var(--color-danger-900)', border: '1px solid var(--color-danger-300)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> {resetErrorMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
              Official Government Email
            </label>
            <Input
              type="email"
              placeholder="officer@nagrikq.org"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button type="button" variant="outline" onClick={() => setIsForgotModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron" disabled={forgotSubmitting}>
              {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffLoginPage;
