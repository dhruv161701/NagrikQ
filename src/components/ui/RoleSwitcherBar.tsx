import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import type { UserRole } from '../../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, UserCheck, Briefcase, Zap, Globe, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../config/languages';

export const RoleSwitcherBar: React.FC = () => {
  const { activeRole, switchUserRole } = useAuth();
  const { uiMode, setUIMode, language, setLanguage, setIsOnboardingOpen } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = (role: UserRole) => {
    switchUserRole(role);
    switch (role) {
      case 'citizen':
        if (!location.pathname.startsWith('/user')) navigate('/user/dashboard');
        break;
      case 'employee':
        if (!location.pathname.startsWith('/employee')) navigate('/employee/dashboard');
        break;
      case 'admin':
        if (!location.pathname.startsWith('/admin')) navigate('/admin/dashboard');
        break;
      case 'superadmin':
        if (!location.pathname.startsWith('/super-admin')) navigate('/super-admin/dashboard');
        break;
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-neutral-950)',
        color: 'var(--color-white)',
        padding: '6px 16px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 10000,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Role Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--color-accent-500)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={14} /> DEMO PERSONA:
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => handleRoleChange('citizen')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeRole === 'citizen' ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: activeRole === 'citizen' ? 700 : 400,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <UserCheck size={12} /> Citizen
          </button>
          <button
            onClick={() => handleRoleChange('employee')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeRole === 'employee' ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: activeRole === 'employee' ? 700 : 400,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Briefcase size={12} /> Officer (C-04)
          </button>
          <button
            onClick={() => handleRoleChange('admin')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeRole === 'admin' ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: activeRole === 'admin' ? 700 : 400,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={12} /> Mamlatdar Admin
          </button>
          <button
            onClick={() => handleRoleChange('superadmin')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeRole === 'superadmin' ? 'var(--color-primary-700)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: activeRole === 'superadmin' ? 700 : 400,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={12} /> Super Admin
          </button>
        </div>
      </div>

      {/* Mode & Language Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* UI Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, paddingLeft: '4px' }}>UI Mode:</span>
          <button
            onClick={() => setUIMode('modern')}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              border: 'none',
              background: uiMode === 'modern' ? 'var(--color-accent-600)' : 'transparent',
              color: 'white',
              fontWeight: uiMode === 'modern' ? 700 : 400,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Zap size={10} /> Modern
          </button>
          <button
            onClick={() => setUIMode('simple')}
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              border: 'none',
              background: uiMode === 'simple' ? 'var(--color-accent-600)' : 'transparent',
              color: 'white',
              fontWeight: uiMode === 'simple' ? 700 : 400,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Simple
          </button>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Globe size={14} style={{ color: 'var(--color-primary-500)' }} />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            style={{
              background: 'transparent',
              color: 'white',
              border: 'none',
              fontSize: '0.8rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} style={{ color: 'black' }}>
                {l.flag} {l.nativeName}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Onboarding Flow */}
        <button
          onClick={() => setIsOnboardingOpen(true)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Reset Onboarding
        </button>
      </div>
    </div>
  );
};
