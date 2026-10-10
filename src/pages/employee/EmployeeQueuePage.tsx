import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { getCityTables, normalizeTableNumber, formatCounterDisplay } from '../../utils/cityTables';
import type { QueueToken } from '../../types';
import {
  Play,
  CheckCircle,
  XCircle,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Volume2,
  Users,
  ArrowRight,
} from 'lucide-react';

export const EmployeeQueuePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    services,
    queueTokens,
    employees,
    callNextToken,
    updateTokenStatus,
    routeToNextTable,
    refreshQueueTokens,
  } = useData();

  const activeCounter = useMemo(() => {
    return formatCounterDisplay((currentUser as any)?.counterNumber);
  }, [currentUser]);
  const [activeRoutingToken, setActiveRoutingToken] = useState<QueueToken | null>(null);
  const [selectedNextTable, setSelectedNextTable] = useState<string>('');
  const [isSubmittingNextTable, setIsSubmittingNextTable] = useState(false);

  // Only counters assigned to OTHER active employees by Admin (Issue 2)
  const availableNextCounters = useMemo(() => {
    const currentNorm = normalizeTableNumber(activeCounter);
    const map = new Map<string, { counter: string; officerName: string }>();

    (employees || []).forEach((emp) => {
      if (emp.counterNumber && emp.isActive) {
        const formatted = formatCounterDisplay(emp.counterNumber);
        const norm = normalizeTableNumber(formatted);
        if (norm && norm !== currentNorm && !map.has(formatted)) {
          map.set(formatted, {
            counter: formatted,
            officerName: emp.name || 'Officer',
          });
        }
      }
    });

    const assignedList = Array.from(map.values()).sort((a, b) => a.counter.localeCompare(b.counter));
    if (assignedList.length > 0) return assignedList;

    // Resilient fallback to office tables so routing is never blocked
    const city = (currentUser as any)?.district || (currentUser as any)?.selectedCity || 'Rajkot';
    const fallbackTables = getCityTables(city).filter((t) => normalizeTableNumber(t) !== currentNorm);
    return fallbackTables.map((t) => ({
      counter: formatCounterDisplay(t),
      officerName: 'Next Counter Desk',
    }));
  }, [employees, activeCounter, currentUser]);

  // Synchronize default selected next table when modal opens or counters change
  useEffect(() => {
    if (availableNextCounters.length > 0) {
      if (!selectedNextTable || !availableNextCounters.some((c) => c.counter === selectedNextTable)) {
        setSelectedNextTable(availableNextCounters[0].counter);
      }
    } else {
      setSelectedNextTable('');
    }
  }, [availableNextCounters, selectedNextTable]);

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
    return services.map((s) => s.id);
  });

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

  const [filterScope, setFilterScope] = useState<'MY_COUNTER_AND_SERVICES' | 'MY_COUNTER_ALL' | 'ALL_OFFICE'>('MY_COUNTER_AND_SERVICES');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showServiceConfig, setShowServiceConfig] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  // Filter queue tokens based on counter and selected services
  const displayedTokens = useMemo(() => {
    const myNorm = normalizeTableNumber(activeCounter);
    const hasOtherStaffAtC01 = (employees || []).some(
      (e) => e.isActive && normalizeTableNumber(e.counterNumber) === '1' && normalizeTableNumber(e.counterNumber) !== myNorm
    );

    return queueTokens.filter((token) => {
      const tokenNorm = normalizeTableNumber(token.counterNumber);
      const isMyCounter = tokenNorm === myNorm;
      const isUnassignedCounter =
        !token.counterNumber ||
        token.counterNumber === 'Unassigned' ||
        (!hasOtherStaffAtC01 && tokenNorm === '1');

      // Counter & Service scope
      if (filterScope === 'MY_COUNTER_AND_SERVICES') {
        const matchesCounter = isMyCounter;
        const matchesWaitingService =
          token.status === 'WAITING' &&
          (isMyCounter || isUnassignedCounter) &&
          (selectedServiceIds.length === 0 || selectedServiceIds.includes(token.serviceId));
        if (!matchesCounter && !matchesWaitingService) return false;
      } else if (filterScope === 'MY_COUNTER_ALL') {
        if (!isMyCounter && !(token.status === 'WAITING' && isUnassignedCounter)) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && token.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [queueTokens, filterScope, activeCounter, selectedServiceIds, statusFilter, employees]);

  const handleCallNext = async () => {
    if (selectedServiceIds.length === 0) {
      alert('Please check at least one service above that you handle at this counter.');
      return;
    }

    const nextToken = await callNextToken(activeCounter, selectedServiceIds);
    if (nextToken) {
      setAnnouncementMsg(`Calling Token ${nextToken.tokenNumber} for ${nextToken.serviceName} to Counter ${activeCounter}...`);
      setTimeout(() => setAnnouncementMsg(''), 6000);
    } else {
      setAnnouncementMsg(`No citizens currently waiting for your ${selectedServiceIds.length} assigned services.`);
      setTimeout(() => setAnnouncementMsg(''), 5000);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshQueueTokens();
    setTimeout(() => setRefreshing(false), 500);
  };

  const columns: Column<QueueToken>[] = [
    {
      key: 'tokenNumber',
      header: 'Token',
      render: (row) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.15rem',
            color: row.status === 'IN_SERVICE' ? 'var(--color-saffron-800)' : 'var(--color-primary-700)',
          }}
        >
          {row.tokenNumber}
        </span>
      ),
    },
    {
      key: 'citizenName',
      header: 'Citizen',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>{row.citizenName}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{row.citizenPhone || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'serviceName',
      header: 'Service Desk',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-neutral-800)' }}>{row.serviceName}</div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>Priority: {(row as any).priority || 'REGULAR'}</span>
        </div>
      ),
    },
    {
      key: 'counterNumber',
      header: 'Assigned Counter / Step',
      render: (row) => {
        const path = row.counterPath || [];
        const currentIdx = row.currentCounterIndex ?? 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span
              style={{
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: row.counterNumber === activeCounter ? 'var(--color-primary-100)' : 'var(--color-neutral-100)',
                color: row.counterNumber === activeCounter ? 'var(--color-primary-800)' : 'var(--color-neutral-700)',
                fontSize: '0.85rem',
                width: 'fit-content',
              }}
            >
              {row.counterNumber || 'Unassigned'}
            </span>
            {path.length > 1 && (
              <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
                Step {currentIdx + 1} of {path.length} in route
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'issuedAt', header: 'Issued Time' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {row.status === 'WAITING' && (
              <Button
                variant="saffron"
                size="sm"
                onClick={() => updateTokenStatus(row.id, 'IN_SERVICE')}
                icon={<Play size={13} />}
              >
                Call to {activeCounter}
              </Button>
            )}
            {row.status === 'IN_SERVICE' && (
              <>
                <Button
                  variant="saffron"
                  size="sm"
                  onClick={async () => {
                    await updateTokenStatus(row.id, 'COMPLETED');
                  }}
                  icon={<CheckCircle size={13} />}
                  style={{ fontWeight: 700 }}
                >
                  Complete
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (availableNextCounters.length > 0) {
                      setSelectedNextTable(availableNextCounters[0].counter);
                    }
                    setActiveRoutingToken(row);
                  }}
                  icon={<ArrowRight size={13} />}
                  style={{ fontWeight: 700 }}
                >
                  Next Table →
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await updateTokenStatus(row.id, 'NO_SHOW');
                  }}
                  icon={<XCircle size={13} />}
                >
                  No Show
                </Button>
              </>
            )}
            {row.status === 'CALLED' && (
              <Button
                variant="saffron"
                size="sm"
                onClick={() => updateTokenStatus(row.id, 'IN_SERVICE')}
              >
                Start Service
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-800)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid var(--color-primary-200)',
              }}
            >
              <Users size={14} /> Counter Desk: {activeCounter}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
              Officer: <strong>{currentUser?.name || 'Counter Staff'}</strong>
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
            Counter {activeCounter} Live Queue Manager
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Call waiting citizens for your designated services, manage token progress, and route completed cases.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            icon={<RefreshCw size={15} className={refreshing ? 'spin' : ''} />}
          >
            Refresh Queue
          </Button>
          <Button
            variant={showServiceConfig ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowServiceConfig(!showServiceConfig)}
            icon={<Filter size={15} />}
          >
            {showServiceConfig ? 'Hide Assigned Services' : `Assigned Services (${selectedServiceIds.length}/${services.length})`}
          </Button>
          <Button
            variant="saffron"
            onClick={handleCallNext}
            icon={<Play size={18} />}
            style={{ fontWeight: 800, padding: '10px 20px' }}
          >
            Call Next Citizen
          </Button>
        </div>
      </div>

      {/* Announcement Notification */}
      {announcementMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-saffron-100)',
            border: '2px solid var(--color-saffron-400)',
            color: 'var(--color-saffron-900)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <Volume2 size={22} color="var(--color-saffron-800)" />
          <span>{announcementMsg}</span>
        </div>
      )}

      {/* Service Assignment Checkboxes Accordion */}
      {showServiceConfig && (
        <Card
          style={{
            border: '2px solid var(--color-primary-300)',
            backgroundColor: 'var(--color-primary-50)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--color-primary-900)', fontSize: '1.05rem' }}>
                Counter {activeCounter} Service Desk Checkboxes
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                Tokens for checked services will be called when you click "Call Next Citizen".
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="outline" onClick={handleSelectAllServices}>
                Select All
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClearAllServices}>
                Clear All
              </Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {services.map((srv) => {
              const isChecked = selectedServiceIds.includes(srv.id);
              const waitingCount = queueTokens.filter((q) => q.serviceId === srv.id && q.status === 'WAITING').length;

              return (
                <div
                  key={srv.id}
                  onClick={() => handleToggleService(srv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isChecked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)'}`,
                    backgroundColor: isChecked ? 'var(--color-white)' : 'var(--color-neutral-100)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isChecked ? (
                      <CheckSquare size={18} color="var(--color-primary-700)" />
                    ) : (
                      <Square size={18} color="var(--color-neutral-400)" />
                    )}
                    <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? 'var(--color-neutral-900)' : 'var(--color-neutral-600)' }}>
                      {srv.name}
                    </span>
                  </div>
                  {waitingCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-saffron-100)',
                        color: 'var(--color-saffron-800)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {waitingCount} waiting
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Scope and Status Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: 'var(--color-white)',
          borderRadius: '10px',
          border: '1px solid var(--color-neutral-200)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilterScope('MY_COUNTER_AND_SERVICES')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filterScope === 'MY_COUNTER_AND_SERVICES' ? 'var(--color-primary-700)' : 'var(--color-neutral-100)',
                color: filterScope === 'MY_COUNTER_AND_SERVICES' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              My Desk & Assigned Services ({selectedServiceIds.length})
            </button>
            <button
              onClick={() => setFilterScope('ALL_OFFICE')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: filterScope === 'ALL_OFFICE' ? 'var(--color-primary-700)' : 'var(--color-neutral-100)',
                color: filterScope === 'ALL_OFFICE' ? 'white' : 'var(--color-neutral-700)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              All Office Tokens
            </button>
          </div>

          <span style={{ color: 'var(--color-neutral-300)' }}>|</span>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'WAITING', 'IN_SERVICE', 'COMPLETED', 'NO_SHOW'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: `1px solid ${statusFilter === st ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                  backgroundColor: statusFilter === st ? 'var(--color-primary-50)' : 'transparent',
                  color: statusFilter === st ? 'var(--color-primary-900)' : 'var(--color-neutral-600)',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === st ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
          Showing {displayedTokens.length} tokens
        </div>
      </div>

      {/* Queue Table */}
      {displayedTokens.length === 0 ? (
        <EmptyState
          title="No Tokens Found"
          description="There are currently no tokens matching your selected counter or service filters."
        />
      ) : (
        <Table columns={columns} data={displayedTokens} keyExtractor={(row) => row.id} />
      )}

      {/* MODAL: DIRECT CITIZEN TO NEXT TABLE */}
      <Modal
        isOpen={!!activeRoutingToken}
        onClose={() => setActiveRoutingToken(null)}
        title="Direct Citizen to Next Physical Table"
        description="Select the table the citizen must physically visit next in this government office."
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeRoutingToken && (
            <div
              style={{
                backgroundColor: 'var(--color-primary-50)',
                border: '1px solid var(--color-primary-100)',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                  Citizen:
                </span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-950)' }}>
                  {activeRoutingToken.citizenName} ({activeRoutingToken.tokenNumber})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                  Current Counter:
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                  Counter {activeCounter}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                  City Complex:
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                  {activeRoutingToken.selectedCity || 'Rajkot'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--color-neutral-800)',
                marginBottom: '8px',
              }}
            >
              Select Next Table Destination
            </label>
            <select
              value={selectedNextTable}
              onChange={(e) => setSelectedNextTable(e.target.value)}
              disabled={availableNextCounters.length === 0}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-neutral-300)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-primary-900)',
                backgroundColor: availableNextCounters.length === 0 ? 'var(--color-neutral-100)' : 'white',
              }}
            >
              {availableNextCounters.length === 0 ? (
                <option value="" disabled>
                  No other counters assigned to employees by Admin
                </option>
              ) : (
                availableNextCounters.map((item) => (
                  <option key={item.counter} value={item.counter}>
                    Counter {item.counter} ({item.officerName})
                  </option>
                ))
              )}
            </select>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
              {availableNextCounters.length > 0
                ? `Note: The citizen will be transferred to Counter ${selectedNextTable}. The officer assigned by Admin to that counter will call the citizen, and Counter ${activeCounter} will immediately become free for your next citizen.`
                : 'Note: No other counters are currently assigned to employees by the Admin. Add or assign employees in the Admin panel to enable multi-counter routing.'}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => setActiveRoutingToken(null)}
              disabled={isSubmittingNextTable}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!activeRoutingToken || !selectedNextTable) return;
                setIsSubmittingNextTable(true);
                try {
                  await routeToNextTable(activeRoutingToken.id, selectedNextTable);
                  setActiveRoutingToken(null);
                } finally {
                  setIsSubmittingNextTable(false);
                }
              }}
              disabled={isSubmittingNextTable || !selectedNextTable}
              icon={<ArrowRight size={16} />}
              style={{ fontWeight: 800 }}
            >
              {selectedNextTable ? `Confirm & Direct to Counter ${selectedNextTable}` : 'No Other Assigned Counter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
