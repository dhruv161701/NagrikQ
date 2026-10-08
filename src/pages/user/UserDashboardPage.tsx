import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { QueueTrackerCard } from '../../components/queue/QueueTrackerCard';
import { GuidedTourModal } from '../../components/onboarding/GuidedTourModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { getDaysRemaining } from './UserDocumentsPage';
import {
  Search,
  PlusCircle,
  Clock,
  UploadCloud,
  Bot,
  ArrowRight,
  FileCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { getUserActiveToken, getUserApplications, cancelQueueToken } = useData();
  const { uiMode } = useUI();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';
  const [showTour, setShowTour] = useState<boolean>(false);

  useEffect(() => {
    if (sessionStorage.getItem('start_tour_on_dashboard') === 'true') {
      setShowTour(true);
      sessionStorage.removeItem('start_tour_on_dashboard');
    }
  }, []);

  const userId = currentUser?.id || '';
  const activeToken = getUserActiveToken(userId);
  const applications = getUserApplications(userId);
  const activeApplication = applications.find((a) => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED');

  // Document Expiry Check (15-day alert rule)
  const expiringDocs = useMemo(() => {
    const storageKey = currentUser?.id ? `nagrikq_vault_${currentUser.id}` : 'nagrikq_vault_guest';
    let docs: any[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        docs = JSON.parse(saved);
      } else {
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
        docs = [
          {
            id: 'vault-init-income',
            name: 'Income Certificate',
            expiryDate: tenDaysFromNow.toISOString().split('T')[0],
            validityPeriod: 'Valid for 3 Years',
          },
        ];
      }
    } catch {
      docs = [];
    }

    return docs
      .map((d) => ({
        ...d,
        daysRemaining: getDaysRemaining(d.expiryDate),
      }))
      .filter((d) => d.daysRemaining !== null && d.daysRemaining <= 15 && d.daysRemaining >= 0);
  }, [currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Greeting Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
            Good morning, {currentUser?.name || 'Citizen'}! 👋
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
            Welcome to your NagrikQ Citizen Dashboard. Track your tokens and application updates in real time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" size={isSimple ? 'lg' : 'md'} onClick={() => setShowTour(true)} icon={<Sparkles size={18} />}>
            Take Guided Tour
          </Button>
          <Button variant="saffron" size={isSimple ? 'lg' : 'md'} onClick={() => navigate('/user/services')} icon={<PlusCircle size={18} />}>
            Apply for New Service
          </Button>
        </div>
      </div>

      <GuidedTourModal isOpen={showTour} onClose={() => setShowTour(false)} />

      {/* DOCUMENT EXPIRY ALERT BANNER (15-DAY NOTICE) */}
      {expiringDocs.length > 0 && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>
                Action Required: {expiringDocs.length} Document{expiringDocs.length > 1 ? 's' : ''} Expiring Soon (15-Day Alert)
              </div>
              <div style={{ fontSize: '0.88rem', color: '#b45309', marginTop: '2px' }}>
                {expiringDocs.map((d) => (
                  <span key={d.id} style={{ marginRight: '12px' }}>
                    <strong>{d.name}</strong> expires in <strong>{d.daysRemaining} days</strong> ({d.expiryDate}).
                  </span>
                ))}
                Renew now to maintain valid citizen KYC status.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/user/documents')}
              style={{ borderColor: '#d97706', color: '#92400e', backgroundColor: '#fff' }}
            >
              View Document Vault
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/user/services')}
              icon={<RotateCcw size={15} />}
              style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
            >
              Apply for Renewal
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVE QUEUE CARD (IF ANY) */}
      {activeToken && (
        <div>
          <h2 style={{ fontSize: isSimple ? '1.5rem' : '1.2rem', color: 'var(--color-primary-900)', marginBottom: '12px' }}>
            Active Virtual Queue Token
          </h2>
          <QueueTrackerCard token={activeToken} onCancel={cancelQueueToken} />
        </div>
      )}

      {/* QUICK ACTIONS GRID */}
      <div>
        <h2 style={{ fontSize: isSimple ? '1.5rem' : '1.2rem', color: 'var(--color-primary-900)', marginBottom: '12px' }}>
          Quick Citizen Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Find Service', icon: <Search size={22} />, path: '/user/services', color: 'var(--color-primary-700)' },
            { label: 'My Applications', icon: <FileCheck size={22} />, path: '/user/applications', color: 'var(--color-info-700)' },
            { label: 'My Queue Token', icon: <Clock size={22} />, path: '/user/queue', color: 'var(--color-accent-600)' },
            { label: 'Document Vault', icon: <UploadCloud size={22} />, path: '/user/documents', color: 'var(--color-success-700)' },
            { label: 'Ask AI Assistant', icon: <Bot size={22} />, path: '/user/assistant', color: 'var(--color-primary-700)' },
          ].map((act, idx) => (
            <Card
              key={idx}
              hoverable
              onClick={() => navigate(act.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: isSimple ? '24px 18px' : '20px 16px',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div style={{ color: act.color }}>{act.icon}</div>
              <span style={{ fontWeight: 700, fontSize: isSimple ? '1.1rem' : '0.95rem', color: 'var(--color-neutral-900)' }}>
                {act.label}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* ACTIVE APPLICATION PROGRESS & RECENT APPLICATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Active Application Card */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>Active Application</h3>
              {activeApplication && <StatusBadge status={activeApplication.status} />}
            </div>

            {activeApplication ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
                  {activeApplication.serviceName}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                  ID: {activeApplication.applicationNumber} • Submitted: {activeApplication.submittedAt}
                </div>
                <div style={{ backgroundColor: 'var(--color-neutral-100)', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary-700)' }}>
                    Current Office Status:
                  </span>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-800)', marginTop: '2px' }}>
                    {activeApplication.timeline[activeApplication.timeline.length - 1]?.note || 'Processing under verification.'}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.9rem' }}>
                No active application in review. Start a new service application anytime.
              </p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/user/applications')} icon={<ArrowRight size={16} />}>
            View All Applications ({applications.length})
          </Button>
        </Card>

        {/* Recent Applications List */}
        <Card>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', marginBottom: '16px' }}>
            Application History
          </h3>
          {applications.length === 0 ? (
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.9rem' }}>
              No application history yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-neutral-200)',
                    backgroundColor: 'var(--color-neutral-50)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                      {app.serviceName}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                      {app.applicationNumber} • {app.submittedAt}
                    </span>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
