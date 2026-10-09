import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Phone, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

export const PhoneSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState<string>(() => sessionStorage.getItem('onboarding_phone') || '');
  const [error, setError] = useState<string>('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    sessionStorage.setItem('onboarding_phone', cleanPhone.slice(-10));
    navigate('/onboarding/mode');
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--color-neutral-50)',
      }}
    >
      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              Step 3 of 4
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
              Mobile Phone Number
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>NagrikQ Onboarding</span>
        </div>

        <Card style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Phone size={28} />
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)', marginTop: '8px' }}>
              Enter your mobile phone number
            </h1>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              We use your mobile number for queue status SMS alerts, Telegram bot updates, and ticket verification.
            </p>
          </div>

          <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-error-100)',
                  color: 'var(--color-error-700)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                10-Digit Mobile Number
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-neutral-100)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    color: 'var(--color-neutral-700)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  +91
                </div>
                <Input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--color-neutral-600)',
                backgroundColor: 'var(--color-neutral-100)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ShieldCheck size={18} style={{ color: 'var(--color-primary-700)', flexShrink: 0 }} />
              <span>Your phone number is kept private and used only for official NagrikQ service notifications.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate('/onboarding/dob')}
                icon={<ArrowLeft size={18} />}
                style={{ flex: 1 }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                icon={<ArrowRight size={18} />}
                style={{ flex: 2 }}
              >
                Continue to UI Mode Selection
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
