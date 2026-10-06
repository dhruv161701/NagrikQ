import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  MapPin,
  XCircle,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

export const UserQueuePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { getUserActiveToken, cancelQueueToken } = useData();
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  const userId = currentUser?.id || '';
  const activeToken = getUserActiveToken(userId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
          Live Virtual Queue Tracker
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
          Realtime status connected to counter C-04 at Rajkot Mamlatdar Office.
        </p>
      </div>

      {!activeToken ? (
        <EmptyState
          title="No Active Queue Token"
          description="You currently do not have a live token. Browse government services to generate a new token."
          actionText="Browse Services & Get Token"
          onAction={() => (window.location.href = '/user/services')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Main Giant Token Hero Display */}
          <Card
            style={{
              backgroundColor: 'var(--color-primary-900)',
              color: 'white',
              padding: isSimple ? '36px' : '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ACTIVE TOKEN • COUNTER {activeToken.counterNumber}
                </span>
                <h2 style={{ fontSize: isSimple ? '2rem' : '1.6rem', color: 'white', marginTop: '4px' }}>
                  {activeToken.serviceName}
                </h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <MapPin size={16} /> {activeToken.officeName}
                </span>
              </div>
              <StatusBadge status={activeToken.status} />
            </div>

            {/* Metrics Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '16px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Your Token</span>
                <div style={{ fontSize: isSimple ? '3rem' : '2.5rem', fontWeight: 900, color: 'var(--color-accent-500)' }}>
                  {activeToken.tokenNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Now Serving</span>
                <div style={{ fontSize: isSimple ? '3rem' : '2.5rem', fontWeight: 900, color: 'white' }}>
                  {activeToken.peopleAhead > 0 ? `A${(parseInt(activeToken.tokenNumber.replace(/\D/g, ''), 10) - activeToken.peopleAhead).toString().padStart(3, '0')}` : activeToken.tokenNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>People Ahead</span>
                <div style={{ fontSize: isSimple ? '3rem' : '2.5rem', fontWeight: 900, color: '#93C5FD' }}>
                  {activeToken.peopleAhead}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Estimated Wait</span>
                <div style={{ fontSize: isSimple ? '3rem' : '2.5rem', fontWeight: 900, color: '#86EFAC' }}>
                  {activeToken.estimatedWaitMinutes}m
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="saffron"
                  onClick={() => alert('Opening Google Maps Directions to Office...')}
                  icon={<Navigation size={18} />}
                >
                  Get Office Directions
                </Button>
              </div>
              <Button variant="danger" onClick={() => cancelQueueToken(activeToken.id)} icon={<XCircle size={18} />}>
                Cancel Token
              </Button>
            </div>
          </Card>

          {/* Timeline Visualizer */}
          <Card>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', marginBottom: '24px' }}>
              Live Token Timeline Progress
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', position: 'relative' }}>
              {[
                { title: 'Token Generated', desc: 'Issued', done: true },
                { title: 'Waiting in Queue', desc: `${activeToken.peopleAhead} ahead`, done: true },
                { title: 'Almost Your Turn', desc: 'Arrive at Lobby', done: activeToken.peopleAhead <= 2 },
                { title: 'Called to Counter', desc: `Counter ${activeToken.counterNumber || 'C-01'}`, done: activeToken.status === 'CALLED' || activeToken.status === 'IN_SERVICE' },
                { title: 'Service Completed', desc: 'Verification finished', done: activeToken.status === 'COMPLETED' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '8px',
                    padding: '16px 12px',
                    borderRadius: '12px',
                    backgroundColor: step.done ? 'var(--color-primary-50)' : 'var(--color-neutral-100)',
                    border: `1px solid ${step.done ? 'var(--color-primary-600)' : 'var(--color-neutral-200)'}`,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: step.done ? 'var(--color-primary-700)' : 'var(--color-neutral-400)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {step.done ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-neutral-900)' }}>
                    {step.title}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>{step.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
