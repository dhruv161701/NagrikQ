import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmployeeDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { services, queueTokens, applications, callNextToken, updateTokenStatus, updateApplicationStatus } = useData();
  const navigate = useNavigate();

  const [activeCounter, setActiveCounter] = useState<string>('C-04');
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [callAlert, setCallAlert] = useState<string>('');

  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; action: string; tokenId?: string }>({
    isOpen: false,
    action: '',
  });

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

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const updated = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      localStorage.setItem(empStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectAllServices = () => {
    const allIds = services.map((s) => s.id);
    setSelectedServiceIds(allIds);
    localStorage.setItem(empStorageKey, JSON.stringify(allIds));
  };

  const handleClearAllServices = () => {
    setSelectedServiceIds([]);
    localStorage.setItem(empStorageKey, JSON.stringify([]));
  };

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

  const handleCompleteCurrent = async () => {
    if (currentCitizen) {
      await updateTokenStatus(currentCitizen.id, 'COMPLETED');
      const citizenApp = applications.find(
        (a) => a.id === currentCitizen.applicationId || (a.citizenId === currentCitizen.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'APPROVED', `Completed and verified at Counter ${activeCounter}.`);
      }
      await handleCallNext();
    }
  };

  const handleApproveAndNext = async () => {
    if (currentCitizen) {
      const citizenApp = applications.find(
        (a) => a.id === currentCitizen.applicationId || (a.citizenId === currentCitizen.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'APPROVED', `Officer verified documents and approved at Counter ${activeCounter}.`);
      }
      await updateTokenStatus(currentCitizen.id, 'COMPLETED');
      await handleCallNext();
    }
  };

  const handleCorrectionAndNext = async () => {
    if (currentCitizen) {
      const citizenApp = applications.find(
        (a) => a.id === currentCitizen.applicationId || (a.citizenId === currentCitizen.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'ACTION_REQUIRED', `Officer requested document correction at Counter ${activeCounter}.`);
      }
      await updateTokenStatus(currentCitizen.id, 'COMPLETED');
      await handleCallNext();
    }
  };

  const handleRejectAndNext = async () => {
    if (currentCitizen) {
      const citizenApp = applications.find(
        (a) => a.id === currentCitizen.applicationId || (a.citizenId === currentCitizen.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'REJECTED', `Officer rejected application proofs at Counter ${activeCounter}.`);
      }
      await updateTokenStatus(currentCitizen.id, 'COMPLETED');
      await handleCallNext();
    }
  };

  const handleSkipCurrent = async () => {
    if (currentCitizen) {
      await updateTokenStatus(currentCitizen.id, 'NO_SHOW');
      setConfirmModalState({ isOpen: false, action: '' });
      await handleCallNext();
    }
  };

  const handleAnnounceSpeaker = () => {
    if (currentCitizen) {
      setAnnouncementMsg(`🔊 Announcement: Token ${currentCitizen.tokenNumber}, please proceed to Counter ${activeCounter}.`);
      setTimeout(() => setAnnouncementMsg(''), 5000);
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

      {/* SERVICE DESK SPECIALIZATION CHECKBOXES */}
      <Card
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} style={{ color: 'var(--color-primary-800)' }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary-900)', margin: 0, fontWeight: 700 }}>
                My Assigned Services Desk ({selectedServiceIds.length} Handled)
              </h3>
            </div>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
              Check the services you are handling today. Citizen applications and queue tokens are routed ONLY for your checked services.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="outline" size="sm" onClick={handleSelectAllServices}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAllServices}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Checkbox Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {services.map((srv) => {
            const isChecked = selectedServiceIds.includes(srv.id);
            return (
              <label
                key={srv.id}
                onClick={(e) => {
                  e.preventDefault();
                  handleToggleService(srv.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isChecked ? 'var(--color-white)' : 'rgba(255,255,255,0.5)',
                  border: `1.5px solid ${isChecked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)'}`,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: isChecked ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {isChecked ? (
                  <CheckSquare size={18} style={{ color: 'var(--color-primary-700)', flexShrink: 0 }} />
                ) : (
                  <Square size={18} style={{ color: 'var(--color-neutral-400)', flexShrink: 0 }} />
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: isChecked ? 700 : 500, fontSize: '0.9rem', color: isChecked ? 'var(--color-primary-900)' : 'var(--color-neutral-700)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {srv.name}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                    {srv.code} • {srv.category}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

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

            {/* Officer Action Toolbar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="primary" size="md" onClick={handleApproveAndNext} icon={<CheckCircle size={18} />}>
                Approve & Call Next Citizen
              </Button>
              <Button variant="saffron" size="md" onClick={handleCorrectionAndNext} icon={<AlertTriangle size={18} />}>
                Request Correction & Call Next
              </Button>
              <Button variant="danger" size="md" onClick={handleRejectAndNext} icon={<XCircle size={18} />}>
                Reject & Call Next
              </Button>
              <Button variant="outline" size="md" onClick={handleCompleteCurrent} icon={<CheckCircle size={18} />}>
                Finish Turn & Next
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleAnnounceSpeaker}
                icon={<Volume2 size={18} />}
              >
                Call Announcement Again 🔊
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setConfirmModalState({ isOpen: true, action: 'skip' })}
                icon={<XCircle size={18} />}
                style={{ color: 'var(--color-red-600)' }}
              >
                Skip / No Show & Next
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/employee/applications')}
                icon={<ShieldCheck size={18} />}
              >
                Verify Documents
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

      {/* TWO COLUMN GRID: WAITING QUEUE LIST & RECENT APPLICATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* LEFT: UPCOMING WAITING QUEUE TABLE */}
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

        {/* RIGHT: CITIZEN APPLICATIONS FOR MY SERVICES */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
                Applications for My Services ({assignedApplications.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                Citizen service applications matching your desk
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/employee/applications')} icon={<ArrowRight size={16} />}>
              View All
            </Button>
          </div>

          {assignedApplications.length === 0 ? (
            <EmptyState
              title="No applications submitted yet"
              description="No citizen applications found for your currently selected services."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assignedApplications.slice(0, 6).map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate('/employee/applications')}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-neutral-50)',
                    border: '1px solid var(--color-neutral-200)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                      {app.serviceName}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>
                      {app.applicationNumber} • {app.citizenName} ({app.citizenPhone})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={app.status} />
                    <ArrowRight size={14} style={{ color: 'var(--color-neutral-400)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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
