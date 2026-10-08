import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Button } from '../ui/Button';
import { LayoutDashboard, Layers, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, activeRole, logout, isLoading } = useAuth();
  const { uiMode, setUIMode, t } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = !location.pathname.startsWith('/user') &&
                       !location.pathname.startsWith('/employee') &&
                       !location.pathname.startsWith('/admin') &&
                       !location.pathname.startsWith('/super-admin');

  return (
    <header
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '0 32px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-neutral)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.4rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            Q
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>
                Nagrik<span style={{ color: 'var(--color-primary)' }}>Q</span>
              </span>
              <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(199, 119, 32, 0.12)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                GOVT DIGITAL SEVA
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
              Queue-Free Public Services
            </span>
          </div>
        </Link>

        {/* Navigation Links for Public View */}
        {isPublicPage && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '0.95rem', fontWeight: 600 }}>
            <Link to="/services" style={{ color: 'var(--color-text-secondary)', transition: 'color 0.15s' }}>
              Services
            </Link>
            <a href="#how-it-works" style={{ color: 'var(--color-text-secondary)' }}>
              How It Works
            </a>
            <a href="#ai-assistant" style={{ color: 'var(--color-text-secondary)' }}>
              AI Assistant
            </a>
            <a href="#help" style={{ color: 'var(--color-text-secondary)' }}>
              Help
            </a>
          </nav>
        )}

        {/* Controls & Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Mode Switcher pill */}
          <button
            onClick={() => setUIMode(uiMode === 'modern' ? 'simple' : 'modern')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-page)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
            title="Toggle between Modern & Simple interface mode"
          >
            <Layers size={14} style={{ color: 'var(--color-primary)' }} />
            {uiMode === 'modern' ? '⚡ Modern Mode' : '🧓 Simple Mode'}
          </button>

          {/* User Account / Navigation button */}
          {isLoading ? (
            <div style={{ width: '120px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--color-neutral-100)' }} />
          ) : currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeRole === 'citizen') navigate('/user/dashboard');
                  else if (activeRole === 'employee') navigate('/employee/dashboard');
                  else if (activeRole === 'admin') navigate('/admin/dashboard');
                  else if (activeRole === 'superadmin') navigate('/super-admin/dashboard');
                }}
                icon={<LayoutDashboard size={16} />}
              >
                Dashboard
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                icon={<LogOut size={16} />}
                title="Sign out of account"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
                {t('login')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                {t('getStarted')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
