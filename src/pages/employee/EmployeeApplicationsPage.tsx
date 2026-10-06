import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Application } from '../../types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const EmployeeApplicationsPage: React.FC = () => {
  const { applications, updateDocumentStatus, updateApplicationStatus } = useData();
  const [selectedApp, setSelectedApp] = useState<Application | null>(applications[0] || null);

  const handleDocAction = (docId: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_CORRECTION') => {
    if (!selectedApp) return;
    updateDocumentStatus(selectedApp.id, docId, status);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'correction';
  }>({ isOpen: false, type: 'approve' });

  const handleFinalStatus = () => {
    if (!selectedApp) return;
    if (confirmDialog.type === 'approve') {
      updateApplicationStatus(selectedApp.id, 'APPROVED', 'Officer verified all documents and approved application.');
    } else if (confirmDialog.type === 'reject') {
      updateApplicationStatus(selectedApp.id, 'REJECTED', 'Application rejected due to invalid document proof.');
    } else if (confirmDialog.type === 'correction') {
      updateApplicationStatus(selectedApp.id, 'ACTION_REQUIRED', 'Requested citizen to re-upload clear income proof.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          Officer Document Verification & Application Processing
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Inspect submitted citizen documents, perform identity checks, and mark approval or correction requests.
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications pending review"
          description="There are currently no citizen applications submitted for verification."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Left List of Applications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-neutral-800)' }}>Applications Pending Review</h3>
            {applications.map((app) => (
              <Card
                key={app.id}
                onClick={() => setSelectedApp(app)}
                style={{
                  cursor: 'pointer',
                  border: `2px solid ${selectedApp?.id === app.id ? 'var(--color-primary-700)' : 'var(--color-neutral-200)'}`,
                  backgroundColor: selectedApp?.id === app.id ? 'var(--color-primary-50)' : 'var(--color-white)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>{app.serviceName}</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                      {app.applicationNumber} • {app.citizenName}
                    </span>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </Card>
            ))}
          </div>

          {/* Right Active Inspection Pane */}
          {selectedApp && (
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 700 }}>
                    INSPECTION PANE • {selectedApp.applicationNumber}
                  </span>
                  <StatusBadge status={selectedApp.status} />
                </div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary-900)', marginTop: '4px' }}>
                  {selectedApp.serviceName}
                </h2>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-neutral-600)', marginTop: '2px', display: 'block' }}>
                  Applicant: <strong>{selectedApp.citizenName}</strong> ({selectedApp.citizenPhone}) • Submitted: {selectedApp.submittedAt}
                </span>
              </div>

              {/* Document Items Verification */}
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)', marginBottom: '14px' }}>
                  Submitted Documents Checklist ({selectedApp.documents.length})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {selectedApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-neutral-200)',
                        backgroundColor: 'var(--color-neutral-50)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                            {doc.requirementName}
                          </div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                            File: {doc.fileName}
                          </span>
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>

                      {/* Action buttons for officer */}
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
                          Reject Document
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Application Final Decisions */}
              <div style={{ borderTop: '1px solid var(--color-neutral-200)', paddingTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button
                  variant="danger"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'reject' })}
                >
                  Reject Application
                </Button>
                <Button
                  variant="saffron"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'correction' })}
                >
                  Request Citizen Correction
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setConfirmDialog({ isOpen: true, type: 'approve' })}
                  icon={<CheckCircle size={18} />}
                >
                  Approve & Issue Certificate
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'approve' })}
        onConfirm={handleFinalStatus}
        title={confirmDialog.type === 'approve' ? 'Approve Application?' : confirmDialog.type === 'reject' ? 'Reject Application?' : 'Request Correction?'}
        message={`Are you sure you want to ${confirmDialog.type} application ${selectedApp?.applicationNumber}?`}
        confirmText={confirmDialog.type === 'approve' ? 'Approve' : confirmDialog.type === 'reject' ? 'Reject' : 'Submit Request'}
        variant={confirmDialog.type === 'reject' ? 'danger' : confirmDialog.type === 'correction' ? 'saffron' : 'primary'}
      />
    </div>
  );
};
