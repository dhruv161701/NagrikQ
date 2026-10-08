import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Calendar, ArrowRight, ArrowLeft, Info } from 'lucide-react';

export const DateOfBirthPage: React.FC = () => {
  const navigate = useNavigate();
  const [day, setDay] = useState<string>('15');
  const [month, setMonth] = useState<string>('08');
  const [year, setYear] = useState<string>('1998');
  const [error, setError] = useState<string>('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const currentYear = new Date().getFullYear();

    if (!day || !month || !year || isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      setError('Please enter a valid Date of Birth (DD / MM / YYYY).');
      return;
    }

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > currentYear) {
      setError('Please enter a realistic Date of Birth.');
      return;
    }

    const dobString = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    const calculatedAge = currentYear - yearNum;

    sessionStorage.setItem('onboarding_dob', dobString);
    sessionStorage.setItem('onboarding_age', calculatedAge.toString());

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
              Step 2 of 3
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
              Date of Birth
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
              <Calendar size={28} />
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)', marginTop: '8px' }}>
              Tell us your date of birth
            </h1>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              We use your age solely to suggest an optimal visual interface mode (Modern or Simple).
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                  Day (DD)
                </label>
                <Input
                  type="number"
                  placeholder="15"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  min="1"
                  max="31"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                  Month (MM)
                </label>
                <Input
                  type="number"
                  placeholder="08"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  min="1"
                  max="12"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                  Year (YYYY)
                </label>
                <Input
                  type="number"
                  placeholder="1998"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="1900"
                  max={new Date().getFullYear().toString()}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '14px 16px',
                backgroundColor: 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--color-neutral-700)',
              }}
            >
              <Info size={18} style={{ color: 'var(--color-primary-700)', flexShrink: 0, marginTop: '2px' }} />
              <span>
                Note: Age recommendations are for visual comfort only. You can switch between Modern and Simple modes anytime from Settings.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate('/onboarding/language')}
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
                Continue to UI Recommendation
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
