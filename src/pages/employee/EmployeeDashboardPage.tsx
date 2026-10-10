import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../config/supabase';
import { getCityTables, normalizeTableNumber, formatCounterDisplay } from '../../utils/cityTables';
import {
  Play,
  CheckCircle,
  XCircle,
  Users,
  PauseCircle,
  AlertCircle,
  ArrowRight,
  Volume2,
  FileCheck,
  FileText,
  Ban,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { Application } from '../../types';

export const EmployeeDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    services,
    queueTokens,
    applications,
    employees,
    callNextToken,
    updateTokenStatus,
    routeToNextTable,
    updateApplicationStatus,
    updateDocumentStatus,
    refreshServices,
  } = useData();

  // Authoritative counter assigned to authenticated employee
  const [activeCounter, setActiveCounter] = useState<string>(() => {
    return (currentUser as any)?.counterNumber
      ? formatCounterDisplay((currentUser as any).counterNumber)
      : 'Loading...';
  });

  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [callAlert, setCallAlert] = useState<string>('');

  // NEXT TABLE MODAL STATE
  const [isNextTableModalOpen, setIsNextTableModalOpen] = useState(false);
  const [selectedNextTable, setSelectedNextTable] = useState('C-2');
  const [isSubmittingNextTable, setIsSubmittingNextTable] = useState(false);

  // Fix 11: Document Verification Modal State
  const [isVerifyDocsModalOpen, setIsVerifyDocsModalOpen] = useState(false);
  const [inspectApp, setInspectApp] = useState<Application | null>(null);
  const [physicalDocChecks, setPhysicalDocChecks] = useState<Record<string, 'OK' | 'NOT OK'>>({});
  const [verificationError, setVerificationError] = useState<string>('');

  // Stop Booking Confirmation Modal State
  const [stopBookingModalOpen, setStopBookingModalOpen] = useState(false);
  const [serviceToStop, setServiceToStop] = useState<any>(null);
  const [isStoppingBooking, setIsStoppingBooking] = useState(false);

  // Fetch Authoritative Counter and Service Assignments from DB
  useEffect(() => {
    const fetchOfficerProfile = async () => {
      if (!currentUser?.id) return;
      try {
        let resolvedCounter: string | null = null;
        let resolvedServices: string[] | null = null;

        const { data: officer } = await supabase
          .from('officers')
          .select('counter_number, assigned_service_ids')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (officer?.counter_number) {
          resolvedCounter = officer.counter_number;
        }
        if (Array.isArray(officer?.assigned_service_ids) && officer.assigned_service_ids.length > 0) {
          resolvedServices = officer.assigned_service_ids;
        }

        if (!resolvedCounter) {
          const { data: staff } = await supabase
            .from('staff_profiles')
            .select('counter_number, assigned_service_ids')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (staff?.counter_number) {
            resolvedCounter = staff.counter_number;
          }
          if (!resolvedServices && Array.isArray(staff?.assigned_service_ids) && staff.assigned_service_ids.length > 0) {
            resolvedServices = staff.assigned_service_ids;
          }
        }

        if (!resolvedCounter) {
          const { data: counterRow } = await supabase
            .from('counters')
            .select('counter_number')
            .or(`assigned_employee_id.eq.${currentUser.id},assigned_officer_id.eq.${currentUser.id}`)
            .maybeSingle();
          if (counterRow?.counter_number) {
            resolvedCounter = counterRow.counter_number;
          }
        }

        if (resolvedCounter) {
          setActiveCounter(formatCounterDisplay(resolvedCounter));
        } else if ((currentUser as any)?.counterNumber) {
          setActiveCounter(formatCounterDisplay((currentUser as any).counterNumber));
        } else {
          setActiveCounter('Unassigned');
        }

        if (resolvedServices) {
          setSelectedServiceIds(resolvedServices);
        }
      } catch (err) {
        console.warn('Officer profile fetch note:', err);
      }
    };
    fetchOfficerProfile();
  }, [currentUser?.id, (currentUser as any)?.counterNumber]);

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

  // Current Citizen at this counter (supporting both C-1 and C-01 format)
  const currentCitizen = useMemo(() => {
    const normActive = normalizeTableNumber(activeCounter);
    return queueTokens.find(
      (q) =>
        normalizeTableNumber(q.counterNumber) === normActive &&
        (q.status === 'IN_SERVICE' || q.status === 'CALLED')
    );
  }, [queueTokens, activeCounter]);

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

    return Array.from(map.values()).sort((a, b) => a.counter.localeCompare(b.counter));
  }, [employees, activeCounter]);

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

  // Waiting citizens for officer's assigned services & counter
  const waitingTokens = useMemo(() => {
    const myNorm = normalizeTableNumber(activeCounter);
    const hasOtherStaffAtC01 = (employees || []).some(
      (e) => e.isActive && normalizeTableNumber(e.counterNumber) === '1' && normalizeTableNumber(e.counterNumber) !== myNorm
    );

    return assignedTokens.filter((q) => {
      if (q.status !== 'WAITING') return false;
      const qNorm = normalizeTableNumber(q.counterNumber);
      const isMyCounter = qNorm === myNorm;
      const isUnassigned = !q.counterNumber || q.counterNumber === 'Unassigned' || (!hasOtherStaffAtC01 && qNorm === '1');
      return isMyCounter || isUnassigned;
    });
  }, [assignedTokens, activeCounter, employees]);

  // Completed today at this counter
  const completedToday = useMemo(() => {
    const normActive = normalizeTableNumber(activeCounter);
    return queueTokens.filter(
      (q) => normalizeTableNumber(q.counterNumber) === normActive && q.status === 'COMPLETED'
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

  // 1. COMPLETE: Citizen's turn at this counter ends, counter freed immediately
  const handleComplete = async () => {
    if (currentCitizen) {
      const citizenToken = currentCitizen;
      await updateTokenStatus(citizenToken.id, 'COMPLETED');
      const citizenApp = applications.find(
        (a) =>
          a.id === citizenToken.applicationId ||
          (a.citizenId === citizenToken.citizenId && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'))
      );
      if (citizenApp) {
        await updateApplicationStatus(citizenApp.id, 'COMPLETED', `Completed and processed at Counter ${activeCounter}.`);
      }
      setAnnouncementMsg(`✓ Completed turn for Citizen ${citizenToken.tokenNumber} at Counter ${activeCounter}. Counter is now free.`);
      setTimeout(() => setAnnouncementMsg(''), 6000);
    }
  };

  // 2. NEXT TABLE: Open modal to pick next physical table
  const handleOpenNextTableModal = () => {
    if (availableCityTables.length > 0) {
      setSelectedNextTable(availableCityTables[0]);
    }
    setIsNextTableModalOpen(true);
  };

  // 2B. CONFIRM NEXT TABLE: Route citizen to next destination, complete turn at current counter, free counter immediately
  const handleConfirmNextTable = async () => {
    if (!currentCitizen || !selectedNextTable) return;
    const citizenToken = currentCitizen;
    const targetTable = selectedNextTable;
    setIsSubmittingNextTable(true);
    try {
      await routeToNextTable(citizenToken.id, targetTable);
      setIsNextTableModalOpen(false);
      setAnnouncementMsg(`✓ Citizen ${citizenToken.tokenNumber} directed to Table ${targetTable}. Counter ${activeCounter} is now free.`);
      setTimeout(() => setAnnouncementMsg(''), 6000);
    } finally {
      setIsSubmittingNextTable(false);
    }
  };

  // 3. NO SHOW
  const handleNoShow = async () => {
    if (currentCitizen) {
      const citizenToken = currentCitizen;
      await updateTokenStatus(citizenToken.id, 'NO_SHOW');
      setAnnouncementMsg(`Citizen ${citizenToken.tokenNumber} marked as No Show. Counter ${activeCounter} is now free.`);
      setTimeout(() => setAnnouncementMsg(''), 5000);
    }
  };

  // Fix 11: Document Verification Handlers
  const handleOpenVerifyDocs = () => {
    if (!currentCitizen) return;
    const citizenApp = applications.find(
      (a) =>
        a.id === currentCitizen.applicationId ||
        (a.citizenId === currentCitizen.citizenId &&
          (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW' || a.status === 'COMPLETED' || a.status === 'APPROVED'))
    );
    if (citizenApp) {
      setInspectApp(citizenApp);
      const initialChecks: Record<string, 'OK' | 'NOT OK'> = {};
      citizenApp.documents.forEach((d) => {
        if (d.status === 'VERIFIED') initialChecks[d.id] = 'OK';
        else if (d.status === 'REJECTED') initialChecks[d.id] = 'NOT OK';
      });
      setPhysicalDocChecks(initialChecks);
    } else {
      const docs = currentCitizen.submittedDocuments || [];
      const virtualApp: Application = {
        id: currentCitizen.id,
        applicationNumber: `APP-${currentCitizen.tokenNumber}`,
        citizenId: currentCitizen.citizenId,
        citizenName: currentCitizen.citizenName,
        citizenPhone: currentCitizen.citizenPhone,
        serviceId: currentCitizen.serviceId,
        serviceName: currentCitizen.serviceName,
        officeId: currentCitizen.officeId,
        officeName: currentCitizen.officeName,
        status: 'UNDER_REVIEW',
        submittedAt: currentCitizen.issuedAt,
        documents: docs.map((d: any, idx: number) => ({
          id: d.id || `doc-${idx}`,
          requirementId: d.requirementId || `req-${idx}`,
          requirementName: d.requirementName || d.name || 'Required Certificate',
          fileUrl: d.fileUrl || '#',
          fileName: d.fileName || 'document.pdf',
          status: 'PENDING',
        })),
        timeline: [],
      };
      setInspectApp(virtualApp);
      setPhysicalDocChecks({});
    }
    setVerificationError('');
    setIsVerifyDocsModalOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!inspectApp) return;
    const docs = inspectApp.documents || [];
    const uncheckedDocs = docs.filter((d) => !physicalDocChecks[d.id]);
    if (uncheckedDocs.length > 0) {
      setVerificationError(`Please mark all ${docs.length} documents as OK or NOT OK before confirming.`);
      return;
    }

    setVerificationError('');
    const hasRejected = docs.some((d) => physicalDocChecks[d.id] === 'NOT OK');

    for (const d of docs) {
      const isOk = physicalDocChecks[d.id] === 'OK';
      await updateDocumentStatus(inspectApp.id, d.id, isOk ? 'VERIFIED' : 'REJECTED');
    }

    if (hasRejected) {
      await updateApplicationStatus(inspectApp.id, 'REJECTED', 'Physical documents rejected during counter inspection.');
      setAnnouncementMsg(`✕ Document verification failed for ${inspectApp.citizenName}. Records updated.`);
    } else {
      await updateApplicationStatus(inspectApp.id, 'APPROVED', 'Physical documents verified and approved at counter.');
      setAnnouncementMsg(`✓ All physical documents verified & approved for ${inspectApp.citizenName}!`);
    }

    setIsVerifyDocsModalOpen(false);
    setTimeout(() => setAnnouncementMsg(''), 6000);
  };

  // Requirement 24: Stop Booking for Today & Resume Booking for Today
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }, []);

  // Item 5: Stop Booking Schedule Check - office hours conclude at 17:00 (5:00 PM)
  const isBookingWindowClosedForToday = useMemo(() => {
    const now = new Date();
    return now.getHours() >= 17;
  }, []);

  const handleOpenStopBooking = (service: any) => {
    if (isBookingWindowClosedForToday) {
      alert("Today's booking slots have already concluded for the day (past 5:00 PM). It is unnecessary to stop booking for a period that is already over.");
      return;
    }
    setServiceToStop(service);
    setStopBookingModalOpen(true);
  };

  const handleConfirmStopBooking = async () => {
    if (!serviceToStop) return;
    setIsStoppingBooking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const officeId = (currentUser as any)?.officeId || 'off-001';

      const res = await fetch(`/api/services/${serviceToStop.id}/stop-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          officeId,
          date: todayDateStr,
        }),
      });

      if (res.ok) {
        setAnnouncementMsg(`✓ Stopped new online bookings for ${serviceToStop.name} for today (${todayDateStr}).`);
        setStopBookingModalOpen(false);
        await refreshServices();
      } else {
        const errJson = await res.json();
        alert(errJson?.error?.message || 'Failed to stop booking.');
      }
    } catch (err: any) {
      alert(err.message || 'Error stopping booking');
    } finally {
      setIsStoppingBooking(false);
      setTimeout(() => setAnnouncementMsg(''), 6000);
    }
  };

  const handleResumeBooking = async (service: any) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const officeId = (currentUser as any)?.officeId || 'off-001';

      const res = await fetch(`/api/services/${service.id}/resume-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          officeId,
          date: todayDateStr,
        }),
      });

      if (res.ok) {
        setAnnouncementMsg(`✓ Resumed online bookings for ${service.name} for today.`);
        await refreshServices();
      } else {
        const errJson = await res.json();
        alert(errJson?.error?.message || 'Failed to resume booking.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resuming booking');
    } finally {
      setTimeout(() => setAnnouncementMsg(''), 6000);
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
            <span
              style={{
                backgroundColor: activeCounter === 'Unassigned' ? 'var(--color-danger-600)' : 'var(--color-accent-600)',
                color: 'white',
                fontWeight: 900,
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: activeCounter === 'Unassigned' ? '0.95rem' : '1.1rem',
              }}
            >
              {activeCounter === 'Unassigned' ? '⚠️ COUNTER UNASSIGNED' : `COUNTER ${activeCounter}`}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Assigned Counter:</span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-900)',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {activeCounter}
            </span>
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
                <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
                  Location: {currentCitizen.selectedCity || 'Rajkot'} • Counter: {activeCounter}
                </div>
              </div>

              <StatusBadge status={currentCitizen.status} />
            </div>

            {/* Officer Action Toolbar - STRICT COMPLETE OR NEXT TABLE OR VERIFY PHYSICAL DOCS */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="saffron"
                size="md"
                onClick={handleComplete}
                icon={<CheckCircle size={18} />}
                style={{ fontWeight: 800, padding: '10px 20px' }}
              >
                Complete
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleOpenNextTableModal}
                icon={<ArrowRight size={18} />}
                style={{ fontWeight: 800, padding: '10px 20px' }}
              >
                Next Table →
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleOpenVerifyDocs}
                icon={<FileCheck size={18} />}
                style={{ fontWeight: 700, padding: '10px 18px', borderColor: 'var(--color-primary-600)', color: 'var(--color-primary-800)' }}
              >
                Verify Physical Docs
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

      {/* REQUIREMENT 24: EMPLOYEE SERVICES & ONLINE BOOKING CONTROL */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: 0, fontWeight: 800 }}>
              Service Desk Operations & Online Booking Control
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
              Manage online citizen appointments for today ({todayDateStr}). Stopping bookings preserves existing tokens and unblocks automatically tomorrow.
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-800)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--color-primary-200)' }}>
            Location: {(currentUser as any)?.officeName || 'Rajkot Jan Seva Kendra'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {services.map((srv) => {
            const isStoppedToday =
              srv.isBookingStopped ||
              (Array.isArray(srv.stoppedBookingDates) && srv.stoppedBookingDates.includes(todayDateStr));

            return (
              <div
                key={srv.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1.5px solid ${isStoppedToday ? 'var(--color-danger-300, #FCA5A5)' : 'var(--color-neutral-200)'}`,
                  backgroundColor: isStoppedToday ? '#FEF2F2' : 'var(--color-white)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-primary-700)' }}>
                      {srv.code || 'SRV-001'}
                    </span>
                    <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', color: 'var(--color-neutral-900)', fontWeight: 700 }}>
                      {srv.name}
                    </h4>
                  </div>
                  {isStoppedToday ? (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Ban size={12} /> STOPPED TODAY
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle size={12} /> BOOKING ACTIVE
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  Slot Duration: {srv.slotDurationMinutes || 30} mins • Capacity: {srv.slotCapacity || 3} citizens/slot
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {isBookingWindowClosedForToday ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={true}
                      style={{ width: '100%', fontWeight: 600, opacity: 0.65 }}
                      title="Today's booking window has finished (past 5:00 PM)"
                    >
                      Booking Window Closed for Today
                    </Button>
                  ) : isStoppedToday ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResumeBooking(srv)}
                      icon={<RotateCcw size={14} />}
                      style={{ width: '100%', fontWeight: 700, borderColor: '#166534', color: '#166534' }}
                    >
                      Resume Booking for Today
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBookingWindowClosedForToday}
                      onClick={() => handleOpenStopBooking(srv)}
                      icon={<Ban size={14} />}
                      style={{
                        width: '100%',
                        fontWeight: 700,
                        borderColor: isBookingWindowClosedForToday ? 'var(--color-neutral-300)' : '#EF4444',
                        color: isBookingWindowClosedForToday ? 'var(--color-neutral-400)' : '#B91C1C',
                        cursor: isBookingWindowClosedForToday ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isBookingWindowClosedForToday ? 'Booking Window Concluded' : 'Stop Booking for Today'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* MODAL: DIRECT CITIZEN TO NEXT TABLE */}
      <Modal
        isOpen={isNextTableModalOpen}
        onClose={() => setIsNextTableModalOpen(false)}
        title="Direct Citizen to Next Physical Table"
        description="Select the physical table the citizen must visit next in this government office."
        maxWidth="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentCitizen && (
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
                  {currentCitizen.citizenName} ({currentCitizen.tokenNumber})
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
                  {currentCitizen.selectedCity || 'Rajkot'}
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
              onClick={() => setIsNextTableModalOpen(false)}
              disabled={isSubmittingNextTable}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmNextTable}
              disabled={isSubmittingNextTable || !selectedNextTable}
              icon={<ArrowRight size={16} />}
              style={{ fontWeight: 800 }}
            >
              {selectedNextTable ? `Confirm & Direct to Counter ${selectedNextTable}` : 'No Other Assigned Counter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* FIX 11: DOCUMENT VERIFICATION MODAL */}
      {inspectApp && (
        <Modal
          isOpen={isVerifyDocsModalOpen}
          onClose={() => setIsVerifyDocsModalOpen(false)}
          title={`Document Verification — ${inspectApp.citizenName}`}
          description={`Verify physical hard-copy documents at Counter ${activeCounter} for Application ${inspectApp.applicationNumber}.`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {verificationError && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={18} />
                <span>{verificationError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-800)' }}>
                Required Service Documents ({inspectApp.documents.length}):
              </div>

              {inspectApp.documents.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: 'var(--color-neutral-50)', borderRadius: '10px', textAlign: 'center', color: 'var(--color-neutral-600)' }}>
                  No physical documents attached for this application.
                </div>
              ) : (
                inspectApp.documents.map((doc) => {
                  const check = physicalDocChecks[doc.id];
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${check === 'OK' ? '#86EFAC' : check === 'NOT OK' ? '#FCA5A5' : 'var(--color-neutral-200)'}`,
                        backgroundColor: check === 'OK' ? '#F0FDF4' : check === 'NOT OK' ? '#FEF2F2' : 'var(--color-neutral-50)',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="var(--color-primary-700)" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-neutral-900)' }}>
                            {doc.requirementName}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                            File: {doc.fileName} • {(doc as any).validityPeriod || 'Valid for 3 Years'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          variant={check === 'OK' ? 'primary' : 'outline'}
                          onClick={() => setPhysicalDocChecks((prev) => ({ ...prev, [doc.id]: 'OK' }))}
                          icon={<CheckCircle size={14} />}
                          style={{
                            fontWeight: 700,
                            backgroundColor: check === 'OK' ? '#16A34A' : undefined,
                            borderColor: '#16A34A',
                            color: check === 'OK' ? 'white' : '#16A34A',
                          }}
                        >
                          OK (Verified)
                        </Button>
                        <Button
                          size="sm"
                          variant={check === 'NOT OK' ? 'danger' : 'outline'}
                          onClick={() => setPhysicalDocChecks((prev) => ({ ...prev, [doc.id]: 'NOT OK' }))}
                          icon={<XCircle size={14} />}
                          style={{
                            fontWeight: 700,
                            backgroundColor: check === 'NOT OK' ? '#DC2626' : undefined,
                            borderColor: '#DC2626',
                            color: check === 'NOT OK' ? 'white' : '#DC2626',
                          }}
                        >
                          NOT OK (Defective)
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <Button variant="secondary" onClick={() => setIsVerifyDocsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmVerification}
                icon={<FileCheck size={16} />}
                style={{ fontWeight: 800 }}
              >
                Save Verification Decision
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REQUIREMENT 24: STOP BOOKING CONFIRMATION DIALOG */}
      {serviceToStop && (
        <Modal
          isOpen={stopBookingModalOpen}
          onClose={() => setStopBookingModalOpen(false)}
          title={`Stop Online Booking for Today?`}
          description={`Confirmation required to disable new citizen slot reservations.`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                borderRadius: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '1rem' }}>
                  Important Operational Notice
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7F1D1D', marginTop: '4px', lineHeight: '1.5' }}>
                  Stopping bookings applies strictly to the current local calendar day.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--color-neutral-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-neutral-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-neutral-600)', fontWeight: 600 }}>Affected Service:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-900)' }}>{serviceToStop.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-neutral-600)', fontWeight: 600 }}>Affected Office/Location:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                  {(currentUser as any)?.officeName || 'Rajkot Jan Seva Kendra'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-neutral-600)', fontWeight: 600 }}>Local Calendar Date:</span>
                <span style={{ fontWeight: 800, color: '#B91C1C' }}>{todayDateStr}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--color-neutral-700)', lineHeight: '1.6' }}>
              <strong>Consequences of stopping new online bookings:</strong>
              <ul style={{ paddingLeft: '20px', margin: '6px 0 0 0' }}>
                <li>Prevent new online citizen slot bookings for this service for the remainder of today.</li>
                <li><strong>Preserve all existing bookings:</strong> citizens who already hold tokens or appointments today remain completely unaffected.</li>
                <li>Tokens are not cancelled, deleted, or invalidated.</li>
                <li>Bookings for future calendar dates remain fully open and bookable.</li>
                <li>Online booking will automatically resume tomorrow when the local calendar date advances.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setStopBookingModalOpen(false)} disabled={isStoppingBooking}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmStopBooking}
                disabled={isStoppingBooking}
                icon={<Ban size={16} />}
                style={{ fontWeight: 800 }}
              >
                {isStoppingBooking ? 'Stopping...' : 'Confirm & Stop Booking for Today'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
