import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowRight, AlertCircle, Mail } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerWithEmail, loginWithGoogle, isLoading, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [needVerification, setNeedVerification] = useState<boolean>(false);

  // Auto-redirect authenticated user away from register page
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      const isOnboarded =
        currentUser.onboardingCompleted === true ||
        (currentUser.id && localStorage.getItem(`nagrikq_onboarding_${currentUser.id}`) === 'true') ||
        (currentUser.email && localStorage.getItem(`nagrikq_onboarding_${currentUser.email}`) === 'true');

      if (currentUser.role === 'citizen' && !isOnboarded) {
        navigate('/onboarding/language', { replace: true });
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
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await registerWithEmail(fullName, email, password);
      if (res.error) {
        setError(res.error);
      } else if (res.needVerification) {
        setNeedVerification(true);
      } else {
        // Direct to adaptive onboarding flow for new citizen!
        navigate('/onboarding/language');
      }
    } catch {
      setError('An error occurred during account registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
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
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <Card style={{ padding: '36px 32px', boxShadow: 'var(--shadow-md)' }}>
          {needVerification ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-100)',
                  color: 'var(--color-success-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <Mail size={32} />
              </div>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary-900)' }}>Check your email</h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
                We've sent a verification link to:
                <br />
                <strong style={{ color: 'var(--color-primary-900)' }}>{email}</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
                Please click the link in your email to activate your account and start your onboarding.
              </p>
              <Button variant="primary" style={{ marginTop: '12px' }} onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-900)', marginBottom: '4px' }}>
                  Nagrik<span style={{ color: 'var(--color-accent-600)' }}>Q</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
                  Create your NagrikQ account
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                  Join thousands of citizens accessing queue-free digital government services
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

              {/* Google OAuth Option */}
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={handleGoogleAuth}
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

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                    Email address
                  </label>
                  <Input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  style={{ marginTop: '6px' }}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--color-primary-700)', fontWeight: 700 }}>
                  Sign In
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
