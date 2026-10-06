import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Play,
  CheckCircle,
  XCircle,
  Volume2,
  Users,
  ShieldCheck,
  PauseCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmployeeDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { queueTokens, callNextToken, updateTokenStatus } = useData();
  const navigate = useNavigate();

  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; action: string; tokenId?: string }>({
    isOpen: false,
    action: '',
  });

  const counterTokens = queueTokens.filter((q) => q.counterNumber === 'C-04');
  const currentCitizen = counterTokens.find((q) => q.status === 'IN_SERVICE');
  const waitingTokens = counterTokens.filter((q) => q.status === 'WAITING');
  const completedToday = counterTokens.filter((q) => q.status === 'COMPLETED').length;

  const handleCallNext = () => {
    callNextToken('C-04');
  };

  const handleCompleteCurrent = () => {
    if (currentCitizen) {
      updateTokenStatus(currentCitizen.id, 'COMPLETED');
    }
  };

  const handleSkipCurrent = () => {
    if (currentCitizen) {
      updateTokenStatus(currentCitizen.id, 'NO_SHOW');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Officer Counter Header */}
      <div
        style={{
          backgroundColor: 'var(--color-primary-900)',
          color: 'white',
          padding: '24px 32px',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: 'var(--color-accent-600)', color: 'white', fontWeight: 900, padding: '4px 12px', borderRadius: '8px', fontSize: '1.1rem' }}>
              COUNTER C-04
            </span>
            <span style={{ fontSize: '0.85rem', color: '#86EFAC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
              {isQueuePaused ? 'QUEUE PAUSED' : 'COUNTER ACTIVE'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', marginTop: '6px' }}>
            Officer Dashboard — {currentUser?.name || 'Counter Officer'}
          </h1>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-300)' }}>
            Revenue & Certificates Verification Counter
          </span>
        </div>

        {/* Counter Stats */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 20px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Waiting</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent-500)' }}>
              {waitingTokens.length}
            </div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 20px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Served Today</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#86EFAC' }}>
              {completedToday}
            </div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 20px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Avg Time</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
              {completedToday > 0 ? '~5 min' : '0 min'}
            </div>
          </div>
        </div>
      </div>

      {/* DOMINANT CURRENT CITIZEN CONTROL BOX */}
      <Card
        style={{
          border: '2px solid var(--color-accent-600)',
          backgroundColor: 'var(--color-white)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, color: 'var(--color-accent-700)', fontSize: '0.9rem', letterSpacing: '1px' }}>
            NOW AT COUNTER C-04
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {isQueuePaused ? (
              <Button variant="saffron" size="sm" onClick={() => setIsQueuePaused(false)}>
                Resume Queue
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsQueuePaused(true)} icon={<PauseCircle size={16} />}>
                Pause Queue
              </Button>
            )}
          </div>
        </div>

        {currentCitizen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'var(--color-primary-50)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-primary-100)' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Active Token</span>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: 'var(--color-primary-900)', lineHeight: '1' }}>
                  {currentCitizen.tokenNumber}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Target Service</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                  {currentCitizen.serviceName}
                </div>
                <span style={{ fontSize: '0.95rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                  Citizen: {currentCitizen.citizenName} ({currentCitizen.citizenPhone})
                </span>
              </div>

              <StatusBadge status={currentCitizen.status} />
            </div>

            {/* Fast Officer Action Toolbar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="lg" onClick={handleCompleteCurrent} icon={<CheckCircle size={20} />}>
                Complete Service (Finish Token)
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => alert(`Announcing token ${currentCitizen.tokenNumber} on counter speaker...`)}
                icon={<Volume2 size={20} />}
              >
                Call Announcement Again 🔊
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => setConfirmModalState({ isOpen: true, action: 'skip' })}
                icon={<XCircle size={20} />}
              >
                Skip / No Show
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/employee/applications')}
                icon={<ShieldCheck size={20} />}
              >
                Verify Documents
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Users size={48} style={{ color: 'var(--color-neutral-400)' }} />
            <div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-neutral-800)' }}>Counter C-04 Ready</h3>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem', marginTop: '4px' }}>
                {waitingTokens.length} citizens waiting in line. Click NEXT to call the next token.
              </p>
            </div>
            <Button variant="saffron" size="lg" onClick={handleCallNext} icon={<Play size={20} />}>
              CALL NEXT CITIZEN (NEXT) →
            </Button>
          </div>
        )}
      </Card>

      {/* UPCOMING WAITING QUEUE TABLE */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Upcoming Queue List ({waitingTokens.length})
          </h3>
          <Button variant="saffron" size="sm" onClick={handleCallNext} icon={<Play size={16} />}>
            Call Next →
          </Button>
        </div>

        {waitingTokens.length === 0 ? (
          <EmptyState
            title="No citizens waiting in line"
            description="The queue for Counter C-04 is currently clear."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {waitingTokens.map((t, idx) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-neutral-50)',
                  border: '1px solid var(--color-neutral-200)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary-700)', minWidth: '60px' }}>
                    {t.tokenNumber}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                      {t.citizenName}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>
                      {t.serviceName} • Issued {t.issuedAt}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                    Ahead: {idx}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false, action: '' })}
        onConfirm={handleSkipCurrent}
        title="Mark Citizen as No Show / Skip?"
        message="This will update the token status to NO_SHOW and remove them from the active counter queue."
        confirmText="Skip Token"
        variant="danger"
      />
    </div>
  );
};
