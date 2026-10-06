import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
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
} from 'lucide-react';

export const EmployeeApplicationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { services, applications, updateDocumentStatus, updateApplicationStatus, refreshApplications } = useData();

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

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Auto-select first application when list changes if none selected or selected not in visible
  useEffect(() => {
    if (visibleApplications.length > 0) {
      const exists = visibleApplications.some((a) => a.id === selectedAppId);
      if (!exists) {
        setSelectedAppId(visibleApplications[0].id);
      }
    } else {
      setSelectedAppId(null);
    }
  }, [visibleApplications, selectedAppId]);

  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  const handleDocAction = (docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION') => {
    if (!selectedApp) return;
    updateDocumentStatus(selectedApp.id, docId, status);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'correction';
    comment?: string;
  }>({ isOpen: false, type: 'approve' });

  const [correctionNote, setCorrectionNote] = useState('');

  const handleFinalStatus = () => {
    if (!selectedApp) return;
    if (confirmDialog.type === 'approve') {
      updateApplicationStatus(selectedApp.id, 'APPROVED', 'Officer verified all documents and approved application.');
    } else if (confirmDialog.type === 'reject') {
      updateApplicationStatus(selectedApp.id, 'REJECTED', 'Application rejected due to invalid or unverified document proofs.');
    } else if (confirmDialog.type === 'correction') {
      updateApplicationStatus(
        selectedApp.id,
        'ACTION_REQUIRED',
        correctionNote.trim() || 'Officer requested citizen to re-upload clear and valid document proof.'
      );
    }
    setCorrectionNote('');
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshApplications();
    setTimeout(() => setRefreshing(false), 500);
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
              <FileCheck2 size={14} /> Verification Desk
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
              Officer: <strong>{currentUser?.name || 'Counter Staff'}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
            Document Verification & Application Processing
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Review citizen-submitted certificates, check uploaded identity proofs, and issue approvals or correction requests.
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

      {visibleApplications.length === 0 ? (
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '24px' }}>
          {/* Left List of Applications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                Citizen Inbox ({visibleApplications.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '720px', overflowY: 'auto', paddingRight: '4px' }}>
              {visibleApplications.map((app) => {
                const isSelected = selectedAppId === app.id;
                return (
                  <Card
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    style={{
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                      backgroundColor: isSelected ? 'var(--color-primary-50)' : 'var(--color-white)',
                      boxShadow: isSelected ? '0 4px 12px rgba(11, 79, 108, 0.12)' : 'none',
                      transition: 'all 0.15s ease',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? 'var(--color-primary-900)' : 'var(--color-neutral-900)' }}>
                        {app.serviceName}
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="var(--color-primary-700)" />
                        <span style={{ fontWeight: 600, color: 'var(--color-neutral-800)' }}>{app.citizenName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
                          {app.applicationNumber}
                        </span>
                        <span>{app.documents.length} Docs</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right Active Inspection Pane */}
          {selectedApp ? (
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
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
                    REF: {selectedApp.applicationNumber}
                  </span>
                  <StatusBadge status={selectedApp.status} />
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '4px' }}>
                  {selectedApp.serviceName}
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
                    <span>Applicant: <strong>{selectedApp.citizenName}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={15} color="var(--color-primary-700)" />
                    <span>Contact: <strong>{selectedApp.citizenPhone || 'N/A'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="var(--color-primary-700)" />
                    <span>Submitted: <strong>{selectedApp.submittedAt}</strong></span>
                  </div>
                </div>

                {selectedApp.notes && (
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
                    <strong>Officer / System Note:</strong> {selectedApp.notes}
                  </div>
                )}
              </div>

              {/* Document Items Verification */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)', fontWeight: 700 }}>
                    Submitted Documents Checklist ({selectedApp.documents.length})
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
                    Verify each document proof before making final decision
                  </span>
                </div>

                {selectedApp.documents.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-500)', backgroundColor: 'var(--color-neutral-50)', borderRadius: '8px' }}>
                    No supporting documents attached with this submission.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {selectedApp.documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          border: `1.5px solid ${
                            doc.status === 'VERIFIED'
                              ? 'var(--color-green-300)'
                              : doc.status === 'REJECTED'
                              ? 'var(--color-red-300)'
                              : doc.status === 'NEEDS_CORRECTION'
                              ? 'var(--color-saffron-300)'
                              : 'var(--color-neutral-200)'
                          }`,
                          backgroundColor:
                            doc.status === 'VERIFIED'
                              ? 'var(--color-green-50)'
                              : doc.status === 'REJECTED'
                              ? '#fff5f5'
                              : 'var(--color-neutral-50)',
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

              {/* Application Final Decisions */}
              <div
                style={{
                  borderTop: '1px solid var(--color-neutral-200)',
                  paddingTop: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
                  Final Application Assessment:
                </span>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button
                    variant="danger"
                    onClick={() => setConfirmDialog({ isOpen: true, type: 'reject' })}
                    icon={<XCircle size={16} />}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="saffron"
                    onClick={() => setConfirmDialog({ isOpen: true, type: 'correction' })}
                    icon={<AlertTriangle size={16} />}
                  >
                    Request Correction
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setConfirmDialog({ isOpen: true, type: 'approve' })}
                    icon={<CheckCircle size={18} />}
                  >
                    Approve & Issue Certificate
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-neutral-500)' }}>
                Select an application from the left inbox to inspect citizen proofs and documents.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'approve' })}
        onConfirm={handleFinalStatus}
        title={
          confirmDialog.type === 'approve'
            ? 'Approve Application & Issue Certificate?'
            : confirmDialog.type === 'reject'
            ? 'Reject Application?'
            : 'Request Citizen Correction?'
        }
        message={
          confirmDialog.type === 'approve'
            ? `Are you sure you want to approve application ${selectedApp?.applicationNumber}? This will mark all checks complete.`
            : confirmDialog.type === 'reject'
            ? `Are you sure you want to reject application ${selectedApp?.applicationNumber}? The citizen will receive notice.`
            : `Specify what document or detail the citizen needs to re-upload for ${selectedApp?.applicationNumber}:`
        }
        confirmText={
          confirmDialog.type === 'approve'
            ? 'Confirm Approval'
            : confirmDialog.type === 'reject'
            ? 'Confirm Rejection'
            : 'Send Correction Notice'
        }
        variant={confirmDialog.type === 'reject' ? 'danger' : confirmDialog.type === 'correction' ? 'saffron' : 'primary'}
      />
    </div>
  );
};
