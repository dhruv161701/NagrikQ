import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPasswordReset(email);
      if (res.error) {
        setError(res.error);
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('Failed to send password reset link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--color-neutral-50)',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <Card style={{ padding: '36px 32px', boxShadow: 'var(--shadow-md)' }}>
          {isSuccess ? (
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
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary-900)' }}>Reset Link Sent</h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
                We've sent a password reset link to:
                <br />
                <strong style={{ color: 'var(--color-primary-900)' }}>{email}</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
                Click the link in your inbox to set up your new password.
              </p>
              <Link to="/login" style={{ marginTop: '12px', display: 'inline-block' }}>
                <Button variant="primary" fullWidth icon={<ArrowLeft size={18} />}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-primary-100)',
                    color: 'var(--color-primary-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                  }}
                >
                  <Mail size={24} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
                  Forgot your password?
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                  Enter your email address and we'll send you instructions to reset your password.
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

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                </Button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-neutral-600)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
