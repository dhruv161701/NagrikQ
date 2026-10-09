import React, { useState } from 'react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { SUPPORTED_LANGUAGES } from '../../config/languages';
import type { LanguageCode } from '../../types';
import { GuidedTourModal } from '../../components/onboarding/GuidedTourModal';
import { Layers, Globe, Bell, User, LogOut, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserSettingsPage: React.FC = () => {
  const { uiMode, setUIMode, language, setLanguage } = useUI();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';
  const [showTour, setShowTour] = useState<boolean>(false);

  const [notifications, setNotifications] = useState({
    queueAlerts: true,
    appUpdates: true,
    emailAlerts: true,
    smsAlerts: true,
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
          User Preferences & Settings
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
          Customize interface accessibility mode, preferred language, and realtime notifications.
        </p>
      </div>

      {/* SECTION 1: APPEARANCE MODE (MODERN VS SIMPLE) */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Layers size={22} style={{ color: 'var(--color-primary-700)' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Interface Layout Mode
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-neutral-600)', marginBottom: '16px' }}>
          NagrikQ provides two dedicated interface modes tailored for maximum accessibility. Switch anytime:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div
            onClick={() => setUIMode('modern')}
            style={{
              padding: '20px',
              borderRadius: '14px',
              border: `2px solid ${uiMode === 'modern' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
              backgroundColor: uiMode === 'modern' ? 'var(--color-primary-50)' : 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>⚡ A- Mode</span>
              {uiMode === 'modern' && <CheckCircle size={20} style={{ color: 'var(--color-primary-700)' }} />}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
              Designed for quick navigation, compact padding, and rich dashboard widgets.
            </p>
          </div>

          <div
            onClick={() => setUIMode('simple')}
            style={{
              padding: '20px',
              borderRadius: '14px',
              border: `2px solid ${uiMode === 'simple' ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
              backgroundColor: uiMode === 'simple' ? 'var(--color-primary-50)' : 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>🧓 A+ Mode</span>
              {uiMode === 'simple' && <CheckCircle size={20} style={{ color: 'var(--color-primary-700)' }} />}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
              Larger text (18px+), spacious buttons (52px+), explicit labels, and minimal cognitive friction.
            </p>
          </div>
        </div>
      </Card>

      {/* SECTION 2: LANGUAGE PREFERENCE */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Globe size={22} style={{ color: 'var(--color-primary-700)' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Preferred Language
          </h3>
        </div>
        <Select
          label="Display Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: `${l.flag} ${l.nativeName} (${l.name})` }))}
        />
      </Card>

      {/* SECTION 3: NOTIFICATIONS TOGGLES */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Bell size={22} style={{ color: 'var(--color-primary-700)' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Notification Alerts
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'queueAlerts', label: 'Queue Position SMS & Push Alerts', desc: 'Notify when token is 3 steps away from counter' },
            { key: 'appUpdates', label: 'Application Status Changes', desc: 'Notify when application is reviewed or approved' },
            { key: 'emailAlerts', label: 'Email Digest Notifications', desc: 'Receive digital certificates via email' },
          ].map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-neutral-50)',
                border: '1px solid var(--color-neutral-200)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                  {item.label}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>{item.desc}</span>
              </div>
              <input
                type="checkbox"
                checked={(notifications as any)[item.key]}
                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </label>
          ))}
        </div>
      </Card>

      {/* SECTION 4: ACCOUNT PROFILE */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <User size={22} style={{ color: 'var(--color-primary-700)' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Account & Citizen Profile
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input label="Full Name" value={currentUser?.name || ''} placeholder="Not logged in" readOnly />
          <Input label="Mobile Phone" value={currentUser?.phone || ''} placeholder="Not provided" readOnly />
          <Input label="Date of Birth" value={currentUser?.dob || ''} placeholder="Not provided" readOnly />
          <Input label="District" value={currentUser?.district || ''} placeholder="Not provided" readOnly />
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="outline" onClick={() => setShowTour(true)} icon={<Sparkles size={16} />}>
            Restart Guided Tour
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            icon={<LogOut size={16} />}
          >
            Log out of Persona
          </Button>
        </div>
      </Card>

      <GuidedTourModal isOpen={showTour} onClose={() => setShowTour(false)} />
    </div>
  );
};
