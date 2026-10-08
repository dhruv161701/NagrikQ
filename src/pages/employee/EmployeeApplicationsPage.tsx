import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/Badge';
import {
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
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
  const [refreshing, setRefreshing] = useState(false);
  const [queueActionBanner, setQueueActionBanner] = useState<string>('');

  // Physical Hard-Copy Inspection Modal State
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [inspectApp, setInspectApp] = useState<Application | null>(null);
  // Physical document inspection record: docId -> 'OK' | 'NOT OK'
  const [physicalDocChecks, setPhysicalDocChecks] = useState<Record<string, 'OK' | 'NOT OK'>>({});
  const [validationError, setValidationError] = useState<string>('');

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

  // Filter applications strictly by assigned services (all status filters removed)
  const visibleApplications = useMemo(() => {
    return applications.filter((app) => {
      if (onlyAssignedFilter && selectedServiceIds.length > 0) {
        if (!selectedServiceIds.includes(app.serviceId)) return false;
      } else if (onlyAssignedFilter && selectedServiceIds.length === 0) {
        return false;
      }
      return true;
    });
  }, [applications, onlyAssignedFilter, selectedServiceIds]);

  // Keep inspectApp synced if applications update in DataContext
  useEffect(() => {
    if (inspectApp) {
      const updated = applications.find((a) => a.id === inspectApp.id);
      if (updated) {
        setInspectApp(updated);
      }
    }
  }, [applications, inspectApp]);

  const targetService = useMemo(() => {
    if (!inspectApp) return null;
    return services.find(
      (s) =>
        s.id === inspectApp.serviceId ||
        s.name.toLowerCase().trim() === inspectApp.serviceName?.toLowerCase().trim()
    );
  }, [inspectApp, services]);

  // Dynamically resolve the authoritative required documents for this service:
  // If the service has configured requiredDocuments (e.g. 2 documents for "abc"), show ONLY those exact 2 documents!
  const activeInspectDocs = useMemo(() => {
    if (!inspectApp) return [];
    if (
      targetService &&
      Array.isArray(targetService.requiredDocuments) &&
      targetService.requiredDocuments.length > 0
    ) {
      return targetService.requiredDocuments.map((reqDoc, idx) => {
        const existing = inspectApp.documents.find(
          (d) =>
            d.requirementId === reqDoc.id ||
            d.requirementName?.toLowerCase().trim() === reqDoc.name?.toLowerCase().trim() ||
            d.id === reqDoc.id
        );
        return {
          id: existing?.id || `req-doc-${reqDoc.id || idx}`,
          requirementId: reqDoc.id,
          requirementName: reqDoc.name,
          fileUrl: existing?.fileUrl || '#',
          fileName: existing?.fileName || `${reqDoc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
          status: existing?.status || 'PENDING',
          validityPeriod: reqDoc.validityPeriod || targetService.documentValidity || 'Valid for 3 Years',
          notes: existing?.notes,
        };
      });
    }
    return inspectApp.documents;
  }, [inspectApp, targetService]);

  const handleOpenDocsModal = (app: Application) => {
    setInspectApp(app);
    const serviceForApp = services.find(
      (s) =>
        s.id === app.serviceId ||
        s.name.toLowerCase().trim() === app.serviceName?.toLowerCase().trim()
    );
    const docs =
      serviceForApp &&
      Array.isArray(serviceForApp.requiredDocuments) &&
      serviceForApp.requiredDocuments.length > 0
        ? serviceForApp.requiredDocuments.map((reqDoc, idx) => {
            const existing = app.documents.find(
              (d) =>
                d.requirementId === reqDoc.id ||
                d.requirementName?.toLowerCase().trim() === reqDoc.name?.toLowerCase().trim() ||
                d.id === reqDoc.id
            );
            return {
              id: existing?.id || `req-doc-${reqDoc.id || idx}`,
              status: existing?.status || 'PENDING',
            };
          })
        : app.documents;

    const initialChecks: Record<string, 'OK' | 'NOT OK'> = {};
    docs.forEach((d) => {
      if (d.status === 'VERIFIED') initialChecks[d.id] = 'OK';
      else if (d.status === 'REJECTED') initialChecks[d.id] = 'NOT OK';
    });
    setPhysicalDocChecks(initialChecks);
    setValidationError('');
    setIsDocsModalOpen(true);
  };

  // FINAL "DONE" ACTION HANDLER
  // Evaluates whether all documents are marked OK or if any document is marked NOT OK.
  // Advances service if all OK; stops and notifies citizen if any NOT OK.
  const handleDonePhysicalCheck = async () => {
    if (!inspectApp) return;

    // Check if every document in activeInspectDocs has been physically checked (OK or NOT OK)
    const uncheckedDocs = activeInspectDocs.filter((d) => !physicalDocChecks[d.id]);
    if (uncheckedDocs.length > 0) {
      setValidationError(
        `Please inspect all documents. The following documents have not been marked: ${uncheckedDocs
          .map((d) => d.requirementName)
          .join(', ')}.`
      );
      return;
    }

    setValidationError('');
    const currentApplicantName = inspectApp.citizenName || 'Applicant';

    // Identify failed documents
    const failedDocs = activeInspectDocs.filter((d) => physicalDocChecks[d.id] === 'NOT OK');
    const isAllOk = failedDocs.length === 0;

    if (isAllOk) {
      // 1. ALL OK: Mark physical check completed and allow process to proceed
      for (const d of activeInspectDocs) {
        await updateDocumentStatus(inspectApp.id, d.id, 'VERIFIED');
      }

      await updateApplicationStatus(
        inspectApp.id,
        'APPROVED',
        'Physical document check completed: all required hard-copy documents verified OK at counter.'
      );

      // Close current citizen's turn
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

      // Automatically call next citizen in queue
      const nextToken = await callNextToken(activeCounter, selectedServiceIds);

      setIsDocsModalOpen(false);

      if (nextToken) {
        setQueueActionBanner(
          `✓ Physical verification passed (All Documents OK)! ${currentApplicantName}'s service is proceeding. 📢 Automatically calling NEXT: Token ${nextToken.tokenNumber} (${nextToken.serviceName}) to Counter ${activeCounter}!`
        );
      } else {
        setQueueActionBanner(
          `✓ Physical verification passed (All Documents OK)! ${currentApplicantName}'s service is proceeding. No other citizens currently waiting in queue.`
        );
      }
    } else {
      // 2. ONE OR MORE NOT OK: Stop process and inform user which document needs correction
      const failedNames = failedDocs.map((d) => d.requirementName).join(', ');

      for (const d of activeInspectDocs) {
        const isThisOk = physicalDocChecks[d.id] === 'OK';
        await updateDocumentStatus(inspectApp.id, d.id, isThisOk ? 'VERIFIED' : 'REJECTED');
      }

      await updateApplicationStatus(
        inspectApp.id,
        'REJECTED',
        `Physical document check failed at counter. Documents needing correction: ${failedNames}. Please correct physical documents and return through the normal booking process.`
      );

      // Close current citizen's token (stopped)
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

      // Automatically call next citizen in queue
      const nextToken = await callNextToken(activeCounter, selectedServiceIds);

      setIsDocsModalOpen(false);

      if (nextToken) {
        setQueueActionBanner(
          `✕ Physical document check failed for ${currentApplicantName} (${failedNames}). Application stopped. 📢 Automatically calling NEXT: Token ${nextToken.tokenNumber} to Counter ${activeCounter}!`
        );
      } else {
        setQueueActionBanner(
          `✕ Physical document check failed for ${currentApplicantName} (${failedNames}). Application stopped. Citizen informed to correct physical documents.`
        );
      }
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

        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
          Showing {visibleApplications.length} of {applications.length} applications
        </div>
      </div>

      {/* FULL WIDTH CITIZEN INBOX */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
            Citizen Applications Inbox ({visibleApplications.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
            Click <strong>Check Physical Docs</strong> on any citizen row to physically verify documents at Counter {activeCounter}
          </span>
        </div>

        {refreshing && applications.length === 0 ? (
          <SkeletonTable rows={5} cols={5} />
        ) : visibleApplications.length === 0 ? (
          <EmptyState
            title={
              onlyAssignedFilter && selectedServiceIds.length === 0
                ? 'No Services Selected'
                : 'No Applications To Process'
            }
            description={
              onlyAssignedFilter && selectedServiceIds.length === 0
                ? 'Please select at least one service above to view citizen applications.'
                : 'There are currently no citizen applications for your assigned services.'
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

                  {/* Check Physical Docs Action Button */}
                  <div>
                    {app.status === 'APPROVED' || app.status === 'REJECTED' || app.status === 'COMPLETED' ? (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--color-success-800)',
                          backgroundColor: 'var(--color-success-50)',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-success-300)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ✓ Processing Complete
                      </span>
                    ) : (
                      <Button
                        variant="saffron"
                        size="sm"
                        onClick={() => handleOpenDocsModal(app)}
                        icon={<FileText size={15} />}
                        style={{ fontWeight: 700, padding: '8px 18px' }}
                      >
                        Check Physical Docs
                      </Button>
                    )}
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

            {/* Physical Document Verification at Counter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary-900)', fontWeight: 800, margin: 0 }}>
                    Physical Hard-Copy Document Check ({activeInspectDocs.length})
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                    Physically inspect each original document presented by the applicant at Counter {activeCounter}. Mark each as <strong>OK</strong> or <strong>NOT OK</strong>.
                  </span>
                </div>
                <Badge variant="warning">Physical Counter Inspection</Badge>
              </div>

              {/* Validation alert banner if officer has not marked all docs */}
              {validationError && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-danger-50)',
                    border: '1.5px solid var(--color-danger-400)',
                    color: 'var(--color-danger-900)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={18} color="var(--color-danger-600)" />
                  {validationError}
                </div>
              )}

              {activeInspectDocs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-500)', backgroundColor: 'var(--color-neutral-50)', borderRadius: '8px' }}>
                  No required documents registered for this service.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {activeInspectDocs.map((doc) => {
                    const currentCheck = physicalDocChecks[doc.id];
                    const isOk = currentCheck === 'OK';
                    const isNotOk = currentCheck === 'NOT OK';

                    return (
                      <div
                        key={doc.id}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '10px',
                          border: `1.5px solid ${
                            isOk
                              ? '#16a34a'
                              : isNotOk
                              ? '#dc2626'
                              : 'var(--color-neutral-300)'
                          }`,
                          backgroundColor: isOk
                            ? '#f0fdf4'
                            : isNotOk
                            ? '#fef2f2'
                            : 'white',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <FileText
                            size={22}
                            color={
                              isOk
                                ? '#16a34a'
                                : isNotOk
                                ? '#dc2626'
                                : 'var(--color-primary-800)'
                            }
                          />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-neutral-900)' }}>
                              {doc.requirementName}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                              Physical hard-copy document presented at desk
                            </span>
                          </div>
                        </div>

                        {/* Per-Document Checking: ONLY OK and NOT OK buttons */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPhysicalDocChecks((prev) => ({ ...prev, [doc.id]: 'OK' }));
                              setValidationError('');
                            }}
                            style={{
                              padding: '8px 22px',
                              borderRadius: '8px',
                              border: isOk ? '2px solid #16a34a' : '1.5px solid #d1d5db',
                              backgroundColor: isOk ? '#16a34a' : 'white',
                              color: isOk ? 'white' : '#374151',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              boxShadow: isOk ? '0 2px 8px rgba(22, 163, 74, 0.3)' : 'none',
                            }}
                          >
                            ✓ OK
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPhysicalDocChecks((prev) => ({ ...prev, [doc.id]: 'NOT OK' }));
                              setValidationError('');
                            }}
                            style={{
                              padding: '8px 22px',
                              borderRadius: '8px',
                              border: isNotOk ? '2px solid #dc2626' : '1.5px solid #d1d5db',
                              backgroundColor: isNotOk ? '#dc2626' : 'white',
                              color: isNotOk ? 'white' : '#374151',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              boxShadow: isNotOk ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                            }}
                          >
                            ✕ NOT OK
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SINGLE "DONE" ACTION */}
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
                  Physical Document Check Result:
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                  If all documents are OK, service proceeds. If any document is NOT OK, process stops.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" onClick={() => setIsDocsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDonePhysicalCheck}
                  icon={<CheckCircle size={18} />}
                  style={{
                    padding: '10px 32px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                  }}
                >
                  DONE
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
