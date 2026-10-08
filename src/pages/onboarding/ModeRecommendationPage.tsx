import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import type { UIMode, LanguageCode } from '../../types';

export const ModeRecommendationPage: React.FC = () => {
  const { currentUser, completeOnboarding } = useAuth();
  const { setUIMode } = useUI();
  const navigate = useNavigate();

  const [age, setAge] = useState<number>(28);
  const [dob, setDob] = useState<string>('15/08/1998');
  const [lang, setLang] = useState<LanguageCode>('en');

  const recommendedMode: UIMode = age < 35 ? 'modern' : 'simple';
  const [selectedMode, setSelectedMode] = useState<UIMode>(recommendedMode);

  useEffect(() => {
    const storedAge = sessionStorage.getItem('onboarding_age');
    const storedDob = sessionStorage.getItem('onboarding_dob');
    const storedLang = sessionStorage.getItem('onboarding_lang') as LanguageCode;

    if (storedAge) {
      const parsedAge = parseInt(storedAge, 10);
      setAge(parsedAge);
      setSelectedMode(parsedAge < 35 ? 'modern' : 'simple');
    }
    if (storedDob) setDob(storedDob);
    if (storedLang) setLang(storedLang);
  }, []);

  const handleFinishOnboarding = (modeToSave: UIMode) => {
    setUIMode(modeToSave);
    completeOnboarding({
      language: lang,
      dob: dob,
      uiMode: modeToSave,
    });

    // Save persistent flags so user is never asked again
    localStorage.setItem('nagrikq_onboarded', 'true');
    if (currentUser?.id) {
      localStorage.setItem(`nagrikq_onboarding_${currentUser.id}`, 'true');
    }
    if (currentUser?.email) {
      localStorage.setItem(`nagrikq_onboarding_${currentUser.email}`, 'true');
    }

    // Clear temporary onboarding keys
    sessionStorage.removeItem('onboarding_lang');
    sessionStorage.removeItem('onboarding_dob');
    sessionStorage.removeItem('onboarding_age');

    navigate('/user/dashboard');
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
      <div style={{ maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              Step 3 of 3
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
              Interface Personalization
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>NagrikQ Onboarding</span>
        </div>

        <Card style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--color-accent-100)',
                color: 'var(--color-accent-700)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                fontSize: '0.85rem',
                margin: '0 auto',
              }}
            >
              <Sparkles size={16} /> Based on Age ({age} years)
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
              We recommend {recommendedMode === 'modern' ? '⚡ Modern Mode' : '🧓 Simple Mode'}
            </h1>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              You can accept our recommendation or manually choose your preferred interface style below.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Modern Mode Option */}
            <div
              onClick={() => setSelectedMode('modern')}
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${selectedMode === 'modern' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                backgroundColor: selectedMode === 'modern' ? 'var(--color-primary-50)' : 'var(--color-white)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
                    ⚡ Modern Mode
                  </span>
                  {recommendedMode === 'modern' && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        backgroundColor: 'var(--color-primary-700)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                  Designed for users who prefer a compact digital dashboard with rich visual cards, metrics, and faster navigation.
                </p>
                <ul style={{ fontSize: '0.82rem', color: 'var(--color-neutral-700)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Comfortable density & 16px text</li>
                  <li>Widget cards & quick action badges</li>
                  <li>Subtle motion & dynamic ETA timers</li>
                </ul>
              </div>

              {selectedMode === 'modern' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={20} /> Selected Mode
                </div>
              )}
            </div>

            {/* Simple Mode Option */}
            <div
              onClick={() => setSelectedMode('simple')}
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${selectedMode === 'simple' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                backgroundColor: selectedMode === 'simple' ? 'var(--color-primary-50)' : 'var(--color-white)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
                    🧓 Simple Mode
                  </span>
                  {recommendedMode === 'simple' && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        backgroundColor: 'var(--color-primary-700)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                      }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                  Designed for citizens who prefer maximum clarity, high contrast, extra-large text, and simple step-by-step actions.
                </p>
                <ul style={{ fontSize: '0.82rem', color: 'var(--color-neutral-700)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Spacious layout & 18px+ readable text</li>
                  <li>Large 52px+ buttons with explicit labels</li>
                  <li>Minimal distractions & clear guidance</li>
                </ul>
              </div>

              {selectedMode === 'simple' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={20} /> Selected Mode
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleFinishOnboarding(selectedMode)}
              icon={<ArrowRight size={20} />}
            >
              Continue with {selectedMode === 'modern' ? 'Modern Mode' : 'Simple Mode'}
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
              <ShieldCheck size={16} /> You can change mode anytime in Settings → Appearance.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
