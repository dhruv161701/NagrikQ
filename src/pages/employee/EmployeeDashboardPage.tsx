import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Play,
  CheckCircle,
  XCircle,
  Users,
  PauseCircle,
  AlertCircle,
  ArrowRight,
  Volume2,
} from 'lucide-react';

export const EmployeeDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    services,
    queueTokens,
    applications,
    callNextToken,
    updateTokenStatus,
    updateApplicationStatus,
    advanceTokenCounterStep,
  } = useData();

  const [activeCounter, setActiveCounter] = useState<string>('C-04');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [callAlert, setCallAlert] = useState<string>('');

  // EMPLOYEE ASSIGNED SERVICES STATE (Saved per user)
  const empStorageKey = currentUser?.id ? `nagrikq_emp_services_${currentUser.id}` : 'nagrikq_emp_services_default';

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(empStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    // Default to all active services on first visit
    return services.map((s) => s.id);
  });

  // Keep synced if services loaded after mount and employee had empty state
  useEffect(() => {
    if (services.length > 0) {
      try {
        const saved = localStorage.getItem(empStorageKey);
        if (!saved) {
          const allIds = services.map((s) => s.id);
          setSelectedServiceIds(allIds);
          localStorage.setItem(empStorageKey, JSON.stringify(allIds));
        }
      } catch {
        // Ignore
      }
    }
  }, [services, empStorageKey]);

  // FILTERED QUEUE TOKENS: Match officer's assigned services
  const assignedTokens = useMemo(() => {
    return queueTokens.filter((q) => {
      if (selectedServiceIds.length === 0) return false;
      return selectedServiceIds.includes(q.serviceId);
    });
  }, [queueTokens, selectedServiceIds]);

  // Current Citizen at this counter
  const currentCitizen = useMemo(() => {
    return queueTokens.find(
      (q) => q.counterNumber === activeCounter && (q.status === 'IN_SERVICE' || q.status === 'CALLED')
    );
  }, [queueTokens, activeCounter]);

  // Waiting citizens for officer's assigned services
  const waitingTokens = useMemo(() => {
    return assignedTokens.filter((q) => q.status === 'WAITING');
  }, [assignedTokens]);

  // Completed today at this counter
  const completedToday = useMemo(() => {
    return queueTokens.filter(
      (q) => q.counterNumber === activeCounter && q.status === 'COMPLETED'
    ).length;
  }, [queueTokens, activeCounter]);

  // FILTERED APPLICATIONS: Applications matching officer's assigned services
  const assignedApplications = useMemo(() => {
    return applications.filter((app) => {
      if (selectedServiceIds.length === 0) return false;
      return selectedServiceIds.includes(app.serviceId);
    });
  }, [applications, selectedServiceIds]);

  const pendingAppsCount = assignedApplications.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;

  // CALL NEXT CITIZEN
  const handleCallNext = async () => {
    setCallAlert('');
    if (selectedServiceIds.length === 0) {
      setCallAlert('Please select at least one service checkbox above to call waiting citizens.');
      return;
    }

    const nextToken = await callNextToken(activeCounter, selectedServiceIds);
    if (nextToken) {
      setAnnouncementMsg(`Calling Token ${nextToken.tokenNumber} for ${nextToken.serviceName} to Counter ${activeCounter}...`);
      setTimeout(() => setAnnouncementMsg(''), 6000);
    } else {
      setCallAlert('No citizens currently waiting in queue for your selected services.');
      setTimeout(() => setCallAlert(''), 5000);
    }
  };

  // 1. Send to Next Counter
  const handleSendToNextCounter = async () => {
    if (currentCitizen) {
      await advanceTokenCounterStep(currentCitizen.id);
      await handleCallNext();
    }
  };

  // 2. Complete & Next
  const handleCompleteAndNext = async () => {
    if (currentCitizen) {
      await updateTokenStatus(currentCitizen.id, 'COMPLETED');
      const citizenApp = applications.find(
        (a) =>
          a.id === currentCitizen.applicationId ||
          (a.citizenId === currentCitizen.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'COMPLETED', `Completed and processed at Counter ${activeCounter}.`);
      }
      await handleCallNext();
    }
  };

  // 3. No Show
  const handleNoShow = async () => {
    if (currentCitizen) {
      await updateTokenStatus(currentCitizen.id, 'NO_SHOW');
      await handleCallNext();
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
              COUNTER {activeCounter}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#86EFAC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }} />
              {isQueuePaused ? 'QUEUE PAUSED' : 'COUNTER ACTIVE'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'white', marginTop: '6px' }}>
            Officer Dashboard — {currentUser?.name || 'Counter Officer'}
          </h1>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-300)' }}>
            Assigned to {selectedServiceIds.length} of {services.length} Departmental Services
          </span>
        </div>

        {/* Counter Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 18px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Waiting for Me</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent-500)' }}>
              {waitingTokens.length}
            </div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 18px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Served Today</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#86EFAC' }}>
              {completedToday}
            </div>
          </div>
          <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: '10px 18px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Pending Apps</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-border)' }}>
              {pendingAppsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements or Alerts */}
      {announcementMsg && (
        <div style={{ backgroundColor: 'var(--color-accent-50)', border: '1px solid var(--color-accent-300)', color: 'var(--color-accent-900)', padding: '14px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <Volume2 size={20} className="pulse" />
          <span>{announcementMsg}</span>
        </div>
      )}

      {callAlert && (
        <div style={{ backgroundColor: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)', color: 'var(--color-warning-900)', padding: '14px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <AlertCircle size={20} />
          <span>{callAlert}</span>
        </div>
      )}

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontWeight: 800, color: 'var(--color-accent-700)', fontSize: '0.9rem', letterSpacing: '1px' }}>
            NOW AT COUNTER {activeCounter}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Counter:</span>
            <select
              value={activeCounter}
              onChange={(e) => setActiveCounter(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-neutral-300)',
                fontWeight: 700,
                color: 'var(--color-primary-900)',
              }}
            >
              {['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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

            {/* Officer Action Toolbar - STRICT 3 ACTIONS */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendToNextCounter}
                icon={<ArrowRight size={18} />}
              >
                Send to Next Counter
              </Button>
              <Button
                variant="saffron"
                size="md"
                onClick={handleCompleteAndNext}
                icon={<CheckCircle size={18} />}
              >
                Complete & Next
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleNoShow}
                icon={<XCircle size={18} />}
              >
                No Show
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Users size={48} style={{ color: 'var(--color-neutral-400)' }} />
            <div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-neutral-800)' }}>Counter {activeCounter} Ready</h3>
              <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem', marginTop: '4px' }}>
                {waitingTokens.length} citizens waiting for your selected services. Click NEXT to call the next citizen.
              </p>
            </div>
            <Button variant="saffron" size="lg" onClick={handleCallNext} icon={<Play size={20} />}>
              CALL NEXT CITIZEN (NEXT) →
            </Button>
          </div>
        )}
      </Card>

      {/* WAITING QUEUE LIST */}
      <div style={{ width: '100%' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
                Waiting Queue ({waitingTokens.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                Citizens waiting for your handled services
              </span>
            </div>
            <Button variant="saffron" size="sm" onClick={handleCallNext} icon={<Play size={16} />}>
              Call Next →
            </Button>
          </div>

          {waitingTokens.length === 0 ? (
            <EmptyState
              title="No citizens waiting in line"
              description="The queue for your handled services is currently clear."
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary-700)', minWidth: '55px' }}>
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
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
                      Pos: {idx + 1}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
