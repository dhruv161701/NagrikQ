import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Eye,
  FileText,
  User,
  Phone,
  Calendar,
  Volume2,
  Sparkles,
} from 'lucide-react';
import type { Application } from '../../types';

export const EmployeeApplicationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    services,
    applications,
    queueTokens,
    callNextToken,
    updateTokenStatus,
    updateDocumentStatus,
    updateApplicationStatus,
    refreshApplications,
  } = useData();

  const activeCounter = (currentUser as any)?.counterNumber
    ? `C-0${(currentUser as any).counterNumber}`
    : 'C-04';

  // Officer assigned services stored per employee
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

  // Synced if services loaded after mount
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

  const [onlyAssignedFilter, setOnlyAssignedFilter] = useState(true);
  const [showServiceConfig, setShowServiceConfig] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [queueActionBanner, setQueueActionBanner] = useState<string>('');

  // POPUP MODAL STATE FOR "VIEW DOCS"
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [inspectApp, setInspectApp] = useState<Application | null>(null);

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

  // Filter applications by assigned services & status
  const visibleApplications = useMemo(() => {
    return applications.filter((app) => {
      // Service filter
      if (onlyAssignedFilter && selectedServiceIds.length > 0) {
        if (!selectedServiceIds.includes(app.serviceId)) return false;
      } else if (onlyAssignedFilter && selectedServiceIds.length === 0) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && app.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [applications, onlyAssignedFilter, selectedServiceIds, statusFilter]);

  // Keep inspectApp synced if applications update in DataContext
  useEffect(() => {
    if (inspectApp) {
      const updated = applications.find((a) => a.id === inspectApp.id);
      if (updated) {
        setInspectApp(updated);
      }
    }
  }, [applications, inspectApp]);

  const handleOpenDocsModal = (app: Application) => {
    setInspectApp(app);
    setIsDocsModalOpen(true);
  };

  const handleDocAction = (docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION') => {
    if (!inspectApp) return;
    updateDocumentStatus(inspectApp.id, docId, status);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'correction';
    comment?: string;
  }>({ isOpen: false, type: 'approve' });

  const [correctionNote, setCorrectionNote] = useState('');

  // USER ACTION HANDLER: APPROVE, REJECT, OR REQUEST CORRECTION
  // Automatically closes the user's turn (queue token), calls next citizen, and closes the popup!
  const handleFinalStatus = async () => {
    if (!inspectApp) return;

    let actionLabel = '';
    const currentApplicantName = inspectApp.citizenName || 'Applicant';

    if (confirmDialog.type === 'approve') {
      actionLabel = 'Approved & Certificate Issued';
      await updateApplicationStatus(inspectApp.id, 'APPROVED', 'Officer verified all documents and approved application.');
    } else if (confirmDialog.type === 'reject') {
      actionLabel = 'Rejected';
      await updateApplicationStatus(inspectApp.id, 'REJECTED', 'Application rejected due to invalid or unverified document proofs.');
    } else if (confirmDialog.type === 'correction') {
      actionLabel = 'Correction Requested';
      await updateApplicationStatus(
        inspectApp.id,
        'ACTION_REQUIRED',
        correctionNote.trim() || 'Officer requested citizen to re-upload clear and valid document proof.'
      );
    }

    setCorrectionNote('');
    setConfirmDialog({ isOpen: false, type: 'approve' });
    setIsDocsModalOpen(false); // Close the popup box

    // 1. Close current citizen's turn (queue token)
    const matchingTokens = queueTokens.filter(
      (q) =>
        (q.applicationId === inspectApp.id ||
         q.citizenId === inspectApp.citizenId ||
         q.counterNumber === activeCounter) &&
        (q.status === 'IN_SERVICE' || q.status === 'CALLED' || q.status === 'WAITING')
    );

    for (const t of matchingTokens) {
      await updateTokenStatus(t.id, 'COMPLETED');
    }

    // 2. Automatically call next citizen in queue for officer's assigned services
    const nextToken = await callNextToken(activeCounter, selectedServiceIds);

    // 3. Set announcement / notification banner
    if (nextToken) {
      setQueueActionBanner(
        `Application ${actionLabel}! Closed ${currentApplicantName}'s turn. 📢 Now automatically calling NEXT: Token ${nextToken.tokenNumber} (${nextToken.serviceName}) to Counter ${activeCounter}!`
      );
    } else {
      setQueueActionBanner(
        `Application ${actionLabel}! Closed ${currentApplicantName}'s turn. No other citizens currently waiting in queue for your assigned services.`
      );
    }
    setTimeout(() => setQueueActionBanner(''), 9000);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshApplications();
    setTimeout(() => setRefreshing(false), 500);
  };

  const formatDisplayTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
    return dateStr;
  };

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
              <FileCheck2 size={14} /> Verification Desk • Counter {activeCounter}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
              Officer: <strong>{currentUser?.name || 'Counter Staff'}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
            Document Verification & Application Processing
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Review citizen submitted certificates, check uploaded identity proofs, and issue approvals or correction requests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            icon={<RefreshCw size={15} className={refreshing ? 'spin' : ''} />}
          >
            Refresh Data
          </Button>
          <Button
            variant={showServiceConfig ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowServiceConfig(!showServiceConfig)}
            icon={<Filter size={15} />}
          >
            {showServiceConfig ? 'Hide Assigned Services' : `My Assigned Services (${selectedServiceIds.length}/${services.length})`}
          </Button>
        </div>
      </div>

      {/* Real-time Turn Closed & Next Citizen Automatic Call Banner */}
      {queueActionBanner && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-primary-50)',
            border: '2px solid var(--color-primary-500)',
            color: 'var(--color-primary-900)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontWeight: 700,
            fontSize: '1rem',
            boxShadow: '0 6px 16px rgba(11, 79, 108, 0.15)',
            animation: 'fadeIn 0.25s ease-in-out',
          }}
        >
          <Volume2 size={26} color="var(--color-primary-700)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{queueActionBanner}</div>
          <Sparkles size={20} color="var(--color-saffron-600)" style={{ flexShrink: 0 }} />
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
                Officer Service Specialization & Responsibility Checkboxes
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                Check the services you are authorized to verify. Applications for checked services will appear below in your review inbox.
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
              const pendingCount = applications.filter((a) => a.serviceId === srv.id && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW')).length;

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
                  {pendingCount > 0 && (
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
                      {pendingCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filter and Switch bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-neutral-800)' }}>
            <input
              type="checkbox"
              checked={onlyAssignedFilter}
              onChange={(e) => setOnlyAssignedFilter(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Show only my assigned services ({selectedServiceIds.length} active)
          </label>

          <span style={{ color: 'var(--color-neutral-300)' }}>|</span>

          {/* Status filter buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED'].map((st) => (
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
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
          Showing {visibleApplications.length} of {applications.length} applications
        </div>
      </div>

      {/* FULL WIDTH CITIZEN INBOX */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
            Citizen Inbox ({visibleApplications.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
            Click <strong>View Docs</strong> on any citizen row to inspect submitted proofs and take action
          </span>
        </div>

        {refreshing ? (
          <SkeletonTable rows={5} cols={5} />
        ) : visibleApplications.length === 0 ? (
          <EmptyState
            title={
              onlyAssignedFilter && selectedServiceIds.length === 0
                ? 'No Services Selected'
                : 'No Applications Match Filters'
            }
            description={
              onlyAssignedFilter && selectedServiceIds.length === 0
                ? 'Please select at least one service above to view citizen applications.'
                : 'There are currently no citizen applications matching the selected criteria in your assigned services.'
            }
            actionText={onlyAssignedFilter ? 'View All Office Applications' : undefined}
            onAction={onlyAssignedFilter ? () => setOnlyAssignedFilter(false) : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {visibleApplications.map((app) => {
              // Linked token if present
              const linkedToken = queueTokens.find(
                (q) => q.applicationId === app.id || q.citizenId === app.citizenId
              );
              const displayTokenId = linkedToken?.tokenNumber || app.applicationNumber;

              return (
                <div
                  key={app.id}
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-neutral-200)',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Token / Reference Column */}
                  <div style={{ minWidth: '100px' }}>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        color: 'var(--color-primary-800)',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {displayTokenId}
                    </div>
                    {linkedToken?.tokenNumber && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
                        {app.applicationNumber}
                      </span>
                    )}
                  </div>

                  {/* Citizen User Column */}
                  <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-neutral-900)' }}>
                      {app.citizenName || 'Citizen User'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
                      {app.citizenPhone || '+91 9876543210'}
                    </div>
                  </div>

                  {/* Service Column */}
                  <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-800)' }}>
                      {app.serviceName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
                      Priority: REGULAR • {app.documents.length} Docs
                    </div>
                  </div>

                  {/* Assigned Counter Pill */}
                  <div style={{ minWidth: '70px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        backgroundColor: 'var(--color-border-subtle)',
                        color: 'var(--color-text-primary)',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'inline-block',
                      }}
                    >
                      {activeCounter}
                    </span>
                  </div>

                  {/* Issued / Submitted Time */}
                  <div style={{ minWidth: '90px', fontSize: '0.88rem', color: 'var(--color-neutral-700)', fontWeight: 500 }}>
                    {formatDisplayTime(app.submittedAt)}
                  </div>

                  {/* Status Badge */}
                  <div style={{ minWidth: '110px' }}>
                    <StatusBadge status={app.status} />
                  </div>

                  {/* View Docs Action Button */}
                  <div>
                    <Button
                      variant="saffron"
                      size="sm"
                      onClick={() => handleOpenDocsModal(app)}
                      icon={<FileText size={15} />}
                      style={{ fontWeight: 700, padding: '8px 18px' }}
                    >
                      View Docs
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL FOR DOCUMENT VERIFICATION & DECISION */}
      {inspectApp && (
        <Modal
          isOpen={isDocsModalOpen}
          onClose={() => setIsDocsModalOpen(false)}
          title={`Document Inspection — ${inspectApp.applicationNumber}`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
            {/* Header section of application */}
            <div style={{ borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-primary-800)',
                    fontWeight: 800,
                    backgroundColor: 'var(--color-primary-100)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                  }}
                >
                  REF: {inspectApp.applicationNumber}
                </span>
                <StatusBadge status={inspectApp.status} />
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '4px' }}>
                {inspectApp.serviceName}
              </h2>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  marginTop: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-neutral-50)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-neutral-200)',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} color="var(--color-primary-700)" />
                  <span>Applicant: <strong>{inspectApp.citizenName}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={15} color="var(--color-primary-700)" />
                  <span>Contact: <strong>{inspectApp.citizenPhone || 'N/A'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="var(--color-primary-700)" />
                  <span>Submitted: <strong>{inspectApp.submittedAt}</strong></span>
                </div>
              </div>

              {inspectApp.notes && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-saffron-50)',
                    border: '1px solid var(--color-saffron-200)',
                    color: 'var(--color-saffron-900)',
                    fontSize: '0.85rem',
                  }}
                >
                  <strong>Officer / System Note:</strong> {inspectApp.notes}
                </div>
              )}
            </div>

            {/* Document Items Verification */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)', fontWeight: 700 }}>
                  Submitted Documents Checklist ({inspectApp.documents.length})
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
                  Verify each document proof before making final decision
                </span>
              </div>

              {inspectApp.documents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-500)', backgroundColor: 'var(--color-neutral-50)', borderRadius: '8px' }}>
                  No supporting documents attached with this submission.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {inspectApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${
                          doc.status === 'VERIFIED'
                            ? 'var(--color-success-500)'
                            : doc.status === 'REJECTED'
                            ? 'var(--color-error-500)'
                            : doc.status === 'NEEDS_CORRECTION'
                            ? 'var(--color-warning-500)'
                            : 'var(--color-border)'
                        }`,
                        backgroundColor:
                          doc.status === 'VERIFIED'
                            ? 'var(--color-success-50)'
                            : doc.status === 'REJECTED'
                            ? 'var(--color-error-50)'
                            : 'var(--color-bg-page)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <FileText size={20} color="var(--color-primary-700)" style={{ marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)', fontSize: '0.95rem' }}>
                              {doc.requirementName}
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                              Attached File: <strong>{doc.fileName}</strong>
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>

                      {/* File preview button and action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.82rem',
                              color: 'var(--color-primary-700)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            <Eye size={14} /> Open Document File
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)', fontStyle: 'italic' }}>
                            Proof document registered
                          </span>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Button
                            variant={doc.status === 'VERIFIED' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleDocAction(doc.id, 'VERIFIED')}
                            icon={<CheckCircle size={14} />}
                          >
                            Verify ✓
                          </Button>
                          <Button
                            variant={doc.status === 'NEEDS_CORRECTION' ? 'saffron' : 'secondary'}
                            size="sm"
                            onClick={() => handleDocAction(doc.id, 'NEEDS_CORRECTION')}
                            icon={<AlertTriangle size={14} />}
                          >
                            Request Correction
                          </Button>
                          <Button
                            variant={doc.status === 'REJECTED' ? 'danger' : 'secondary'}
                            size="sm"
                            onClick={() => handleDocAction(doc.id, 'REJECTED')}
                            icon={<XCircle size={14} />}
                          >
                            Reject Doc
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Application Final Decisions: Closes Turn & Automatically Calls Next Citizen */}
            <div
              style={{
                borderTop: '1px solid var(--color-neutral-200)',
                paddingTop: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                  Action Decision & Queue Advancement:
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                  Closes applicant turn and calls next waiting citizen automatically.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  variant="danger"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'reject' })}
                  icon={<XCircle size={16} />}
                >
                  Reject Application & Next
                </Button>
                <Button
                  variant="saffron"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'correction' })}
                  icon={<AlertTriangle size={16} />}
                >
                  Request Correction & Next
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'approve' })}
                  icon={<CheckCircle size={18} />}
                >
                  Approve & Call Next Citizen →
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog with Note Input */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'approve' })}
        onConfirm={handleFinalStatus}
        title={
          confirmDialog.type === 'approve'
            ? 'Approve Application & Call Next Citizen?'
            : confirmDialog.type === 'reject'
            ? 'Reject Application & Call Next Citizen?'
            : 'Request Citizen Correction & Call Next Citizen?'
        }
        message={
          confirmDialog.type === 'approve'
            ? `Are you sure you want to approve application ${inspectApp?.applicationNumber}? This will issue certificate approval, conclude the citizen's turn, and automatically call the next citizen to Counter ${activeCounter}.`
            : confirmDialog.type === 'reject'
            ? `Are you sure you want to reject application ${inspectApp?.applicationNumber}? This will notify the citizen, conclude their turn, and automatically call the next waiting citizen.`
            : `Specify what document or detail the citizen needs to re-upload for ${inspectApp?.applicationNumber}:`
        }
        confirmText={
          confirmDialog.type === 'approve'
            ? 'Confirm Approval & Call Next'
            : confirmDialog.type === 'reject'
            ? 'Confirm Rejection & Call Next'
            : 'Send Correction Notice & Call Next'
        }
        variant={confirmDialog.type === 'reject' ? 'danger' : confirmDialog.type === 'correction' ? 'saffron' : 'primary'}
      >
        {confirmDialog.type === 'correction' && (
          <textarea
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            placeholder="e.g. Please re-upload latest financial year ITR or Mamlatdar verified stamp..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-saffron-400)',
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              marginTop: '4px',
            }}
          />
        )}
      </ConfirmDialog>
    </div>
  );
};
