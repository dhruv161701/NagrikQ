import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useUI } from '../../context/UIContext';
import { SUPPORTED_LANGUAGES } from '../../config/languages';
import type { LanguageCode, UIMode } from '../../types';
import { Globe, Calendar, CheckCircle, Sparkles, Eye } from 'lucide-react';

export const AdaptiveOnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, completeOnboarding } = useUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('en');
  const [dob, setDob] = useState<string>('1990-01-01');
  const [calculatedAge, setCalculatedAge] = useState<number>(36);
  const [recommendedMode, setRecommendedMode] = useState<UIMode>('simple');
  const [chosenMode, setChosenMode] = useState<UIMode>('simple');

  const handleCalculateAge = (dobString: string) => {
    setDob(dobString);
    if (!dobString) return;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setCalculatedAge(age);
    const rec: UIMode = age < 35 ? 'modern' : 'simple';
    setRecommendedMode(rec);
    setChosenMode(rec);
  };

  const handleFinish = () => {
    completeOnboarding(chosenMode, selectedLang);
    setStep(1);
  };

  return (
    <Modal
      isOpen={isOnboardingOpen}
      onClose={() => setIsOnboardingOpen(false)}
      title="Welcome to NagrikQ"
      description="Let us tailor your government service experience."
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-primary-700)' }}>Step {step} of 3</span>
            <span style={{ color: 'var(--color-neutral-400)' }}>•</span>
            <span style={{ color: 'var(--color-neutral-600)', fontSize: '0.9rem' }}>
              {step === 1 ? 'Select Language' : step === 2 ? 'Date of Birth' : 'Interface Recommendation'}
            </span>
          </div>
        </div>

        {/* STEP 1: LANGUAGE SELECTION */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-neutral-800)' }}>
              <Globe className="text-primary-700" size={24} />
              <h4 style={{ margin: 0 }}>Choose your preferred language / ભાષા પસંદ કરો</h4>
            </div>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              NagrikQ provides full support for English, Gujarati, and Hindi.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedLang === lang.code ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                    backgroundColor: selectedLang === lang.code ? 'var(--color-primary-50)' : 'var(--color-white)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{lang.flag}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{lang.nativeName}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>{lang.name}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="primary" onClick={() => setStep(2)}>
                Next: Date of Birth →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DATE OF BIRTH */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-neutral-800)' }}>
              <Calendar size={24} style={{ color: 'var(--color-primary-700)' }} />
              <h4 style={{ margin: 0 }}>Enter your Date of Birth</h4>
            </div>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              We use your age to suggest the most comfortable display layout for your device.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-neutral-800)' }}>
                Date of Birth (DD / MM / YYYY)
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => handleCalculateAge(e.target.value)}
                style={{
                  height: '48px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-neutral-300)',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                Calculated Age: {calculatedAge} years
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next: View Recommendation →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: INTERFACE RECOMMENDATION & SELECTION */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: 'var(--color-accent-50)',
                border: '1px solid var(--color-accent-100)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <Sparkles size={24} style={{ color: 'var(--color-accent-600)', flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 700, color: 'var(--color-accent-700)', fontSize: '0.95rem' }}>
                  Recommended Initial Mode: {recommendedMode === 'modern' ? '⚡ A- Mode' : '🧓 A+ Mode'}
                </span>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-700)', marginTop: '4px' }}>
                  Based on your age ({calculatedAge}), we suggest{' '}
                  <strong>{recommendedMode === 'modern' ? 'A- Mode' : 'A+ Mode'}</strong> for optimum accessibility. You can change this anytime from Settings!
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Modern Option */}
              <div
                onClick={() => setChosenMode('modern')}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  border: `2px solid ${chosenMode === 'modern' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                  backgroundColor: chosenMode === 'modern' ? 'var(--color-primary-50)' : 'var(--color-white)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
                    ⚡ A- Mode
                  </span>
                  {chosenMode === 'modern' && <CheckCircle size={20} style={{ color: 'var(--color-primary-700)' }} />}
                </div>
                <ul style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', paddingLeft: '18px', margin: 0, lineHeight: '1.6' }}>
                  <li>Compact navigation</li>
                  <li>Rich dashboard widgets</li>
                  <li>Higher information density</li>
                </ul>
              </div>

              {/* Simple Option */}
              <div
                onClick={() => setChosenMode('simple')}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  border: `2px solid ${chosenMode === 'simple' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                  backgroundColor: chosenMode === 'simple' ? 'var(--color-primary-50)' : 'var(--color-white)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
                    🧓 A+ Mode
                  </span>
                  {chosenMode === 'simple' && <CheckCircle size={20} style={{ color: 'var(--color-primary-700)' }} />}
                </div>
                <ul style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', paddingLeft: '18px', margin: 0, lineHeight: '1.6' }}>
                  <li>Larger fonts (18px+)</li>
                  <li>Big high-contrast buttons</li>
                  <li>Uncluttered focus layouts</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button variant="saffron" onClick={handleFinish} icon={<Eye size={18} />}>
                Start Using NagrikQ →
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
