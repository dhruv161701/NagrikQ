import React from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';

export const EmployeeDocumentsPage: React.FC = () => {
  const { applications } = useData();
  const allDocs = applications.flatMap((a) => a.documents.map((d) => ({ ...d, appNum: a.applicationNumber, citizen: a.citizenName })));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          Document Verification Master Queue
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Overview of all citizen documents submitted across active applications.
        </p>
      </div>

      {allDocs.length === 0 ? (
        <EmptyState
          title="No documents uploaded"
          description="No citizen documents have been submitted for verification yet."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {allDocs.map((doc) => (
            <Card key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                  {doc.appNum}
                </span>
                <StatusBadge status={doc.status} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>{doc.requirementName}</div>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Citizen: {doc.citizen} • File: {doc.fileName}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
