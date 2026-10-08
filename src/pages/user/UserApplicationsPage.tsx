import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import type { Application } from '../../types';
import { Clock, ShieldCheck, Eye } from 'lucide-react';

export const UserApplicationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { getUserApplications } = useData();
  const { uiMode } = useUI();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const userId = currentUser?.id || '';
  const applications = getUserApplications(userId);

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [activeModalApp, setActiveModalApp] = useState<Application | null>(null);

  const filteredApps = applications.filter((app) => {
    if (selectedStatusFilter === 'ALL') return true;
    return app.status === selectedStatusFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
          My Government Applications
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
          Track application status, document verification progress, and official notes from counter officers.
        </p>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTION_REQUIRED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatusFilter(st)}
            style={{
              padding: isSimple ? '10px 18px' : '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${selectedStatusFilter === st ? 'var(--color-primary-700)' : 'var(--color-neutral-300)'}`,
              backgroundColor: selectedStatusFilter === st ? 'var(--color-primary-700)' : 'var(--color-white)',
              color: selectedStatusFilter === st ? 'white' : 'var(--color-neutral-800)',
              fontWeight: 600,
              fontSize: isSimple ? '1rem' : '0.85rem',
              cursor: 'pointer',
            }}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Applications Cards List */}
      {filteredApps.length === 0 ? (
        <EmptyState
          title="No applications found"
          description="You haven't submitted any government service applications yet."
          actionText="Find & Apply for Service"
          onAction={() => navigate('/user/services')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredApps.map((app) => (
            <Card key={app.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: isSimple ? '1.35rem' : '1.15rem', color: 'var(--color-primary-900)', margin: 0 }}>
                      {app.serviceName}
                    </h3>
                    <StatusBadge status={app.status} />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '4px', display: 'block' }}>
                    Application #{app.applicationNumber} • Submitted on {app.submittedAt} • Office: {app.officeName}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setActiveModalApp(app)} icon={<Eye size={16} />}>
                  View Details & Documents
                </Button>
              </div>

              {/* Document verification summary strip */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: 'var(--color-neutral-100)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)' }}>
                  Document Progress ({app.documents.filter((d) => d.status === 'VERIFIED').length} / {app.documents.length} Verified):
                </span>
                {app.documents.map((d) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                    <ShieldCheck size={14} style={{ color: d.status === 'VERIFIED' ? 'var(--color-success-700)' : 'var(--color-warning-700)' }} />
                    <span>{d.requirementName}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Application Detail Modal */}
      {activeModalApp && (
        <Modal
          isOpen={!!activeModalApp}
          onClose={() => setActiveModalApp(null)}
          title={`Application Details — ${activeModalApp.applicationNumber}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>
                {activeModalApp.serviceName}
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
                Submitted to {activeModalApp.officeName} on {activeModalApp.submittedAt}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--color-neutral-900)', marginBottom: '10px' }}>
                Document Verification Breakdown
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeModalApp.documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-neutral-50)',
                      border: '1px solid var(--color-neutral-200)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-neutral-900)' }}>
                        {doc.requirementName}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{doc.fileName}</span>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--color-neutral-900)', marginBottom: '10px' }}>
                Official Timeline & Activity Logs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeModalApp.timeline.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)', marginTop: '2px' }}>
                      <Clock size={14} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>{item.timestamp}</span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-neutral-900)' }}>{item.status}</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
