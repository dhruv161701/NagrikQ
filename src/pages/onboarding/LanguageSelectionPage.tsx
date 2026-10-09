import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LanguageCode } from '../../types';

export const LanguageSelectionPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { setLanguage } = useUI();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(
    currentUser?.preferredLanguage || 'en'
  );

  const languages = [
    {
      code: 'en' as LanguageCode,
      name: 'English',
      native: 'English',
      subtext: 'Default digital experience',
    },
    {
      code: 'gu' as LanguageCode,
      name: 'Gujarati',
      native: 'ગુજરાતી',
      subtext: 'ગુજરાત રાજ્ય સેવાઓ માટે',
    },
    {
      code: 'hi' as LanguageCode,
      name: 'Hindi',
      native: 'हिन्दी',
      subtext: 'राष्ट्र भाषा सहायता',
    },
  ];

  const handleNext = () => {
    setLanguage(selectedLang);
    // Store temporarily in sessionStorage for multi-step onboarding
    sessionStorage.setItem('onboarding_lang', selectedLang);
    navigate('/onboarding/dob');
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
              Step 1 of 4
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
              Profile Personalization
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
              <Globe size={28} />
            </div>
            <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)', marginTop: '8px' }}>
              Choose your preferred language
            </h1>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
              Select the language you feel most comfortable using for government service applications.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {languages.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                    backgroundColor: isSelected ? 'var(--color-primary-50)' : 'var(--color-white)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary-900)' }}>
                        {lang.native}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-500)' }}>
                        ({lang.name})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>
                      {lang.subtext}
                    </span>
                  </div>

                  {isSelected ? (
                    <CheckCircle2 size={24} style={{ color: 'var(--color-primary-700)' }} />
                  ) : (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid var(--color-neutral-300)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            icon={<ArrowRight size={20} />}
            style={{ marginTop: '8px' }}
          >
            Continue to Date of Birth
          </Button>
        </Card>
      </div>
    </div>
  );
};
