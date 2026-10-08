import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  ArrowRight,
  AlertCircle,
  Clock,
  FileText,
  User,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, isLoading, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get('redirect');
  const portalParam = queryParams.get('portal') || queryParams.get('role');

  // If someone visits /login with employee/admin/superadmin query, redirect to /staff-login
  useEffect(() => {
    if (['employee', 'admin', 'superadmin'].includes(portalParam || '')) {
      navigate(`/staff-login?role=${portalParam}`, { replace: true });
    }
  }, [portalParam, navigate]);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-redirect authenticated user away from login page
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      const isOnboarded =
        currentUser.onboardingCompleted === true ||
        (currentUser.id && localStorage.getItem(`nagrikq_onboarding_${currentUser.id}`) === 'true') ||
        (currentUser.email && localStorage.getItem(`nagrikq_onboarding_${currentUser.email}`) === 'true');

      if (currentUser.role === 'citizen' && !isOnboarded) {
        navigate('/onboarding/language', { replace: true });
        return;
      }

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

  const handleEmailLogin = async (e: React.FormEvent) => {
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
          navigate('/user/dashboard');
        }
      }
    } catch {
      setError('An error occurred during sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const res = await loginWithGoogle();
    if (res.error) {
      setError(res.error);
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
        backgroundColor: 'var(--color-neutral-50)',
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
        {/* Left Side Branding Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-900)',
                color: 'var(--color-accent-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.7rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Q
            </div>
            <div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-900)', letterSpacing: '-0.5px' }}>
                Nagrik<span style={{ color: 'var(--color-accent-600)' }}>Q</span>
              </span>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                AI-Powered Seva Portal
              </div>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--color-primary-900)', lineHeight: 1.25 }}>
              Government services.
              <br />
              Without the unnecessary queue.
            </h1>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '1.05rem', marginTop: '12px', lineHeight: 1.6 }}>
              Find the service you need, know required documents in advance, get your virtual queue token, and reach the office at the right time.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-primary-900)' }}>Virtual Tokens</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Track queue position & ETA live from your phone</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-accent-100)', color: 'var(--color-accent-700)' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-primary-900)' }}>Verified Document Checklist</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Know exact document requirements before visiting</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Citizen Login Card */}
        <Card style={{ padding: '32px 28px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '12px',
              }}
            >
              <User size={14} /> PUBLIC CITIZEN SEVA PORTAL
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
              Citizen Sign In
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
              Sign in to apply for government services and track virtual queue tokens
            </p>
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

          {/* Google Sign-In */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={isLoading || isSubmitting}
            style={{
              borderColor: 'var(--color-neutral-300)',
              fontWeight: 700,
              gap: '10px',
              backgroundColor: 'var(--color-white)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: 'var(--color-neutral-400)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-neutral-200)' }} />
            <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-neutral-200)' }} />
          </div>

          {/* Email + Password Sign In */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Email address
              </label>
              <Input
                type="email"
                placeholder="Enter your registered email"
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
                <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
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
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In as Citizen'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary-700)', fontWeight: 700 }}>
              Create account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
