import React from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Users, Building, GitPullRequest, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonMetrics } from '../../components/ui/skeleton';

export const SuperAdminDashboardPage: React.FC = () => {
  const { offices, employees, services, changeRequests, auditLogs } = useData();
  const navigate = useNavigate();

  const pendingRequests = changeRequests.filter((c) => c.status === 'PENDING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            GLOBAL STATE SYSTEM CONTROL
          </span>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '2px' }}>
            Super Admin Governance Dashboard
          </h1>
          <p style={{ color: 'var(--color-neutral-600)' }}>
            System-wide oversight across all district offices, change request approvals, and audit trail security.
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <Button variant="saffron" onClick={() => navigate('/super-admin/change-requests')} icon={<GitPullRequest size={18} />}>
            Review Pending Change Requests ({pendingRequests.length})
          </Button>
        )}
      </div>

      {/* METRICS GRID */}
      {services.length === 0 ? (
        <SkeletonMetrics count={5} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Total Registered Citizens', value: 0, sub: 'Across Gujarat State', icon: <Users size={24} />, color: 'var(--color-primary-700)' },
            { label: 'Active Government Offices', value: offices.length, sub: 'District Jan Seva Kendras', icon: <Building size={24} />, color: 'var(--color-info-700)' },
            { label: 'Active Counter Employees', value: employees.length, sub: 'Verified officers', icon: <Users size={24} />, color: 'var(--color-success-700)' },
            { label: 'State Services Catalog', value: services.length, sub: 'Digital Seva Portal', icon: <Shield size={24} />, color: 'var(--color-accent-600)' },
            { label: 'Pending Change Requests', value: pendingRequests.length, sub: 'Requires Review', icon: <GitPullRequest size={24} />, color: 'var(--color-primary-700)' },
          ].map((m, idx) => (
          <Card key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>{m.label}</span>
              <div style={{ color: m.color }}>{m.icon}</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-neutral-900)' }}>{m.value}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{m.sub}</span>
          </Card>
        ))}
        </div>
      )}

      {/* PENDING CHANGE REQUEST REVIEW BANNER */}
      {pendingRequests.length > 0 && (
        <Card style={{ border: '2px solid var(--color-primary-700)', backgroundColor: 'var(--color-primary-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-700)', fontWeight: 700 }}>
              <GitPullRequest size={20} /> Action Required: {pendingRequests.length} Change Request Pending Approval
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-neutral-700)', marginTop: '4px' }}>
              Admin {pendingRequests[0]?.requestedByAdminName} has proposed adding <strong>"{pendingRequests[0]?.addedDocumentName}"</strong> to {pendingRequests[0]?.serviceName} requirements.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/super-admin/change-requests')} icon={<ArrowRight size={18} />}>
            Review & Make Approval Decision →
          </Button>
        </Card>
      )}

      {/* RECENT SYSTEM AUDIT LOGS PREVIEW */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
            Recent System Activity & Audit Trail
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/audit-logs')} icon={<ArrowRight size={16} />}>
            View Full System Audit Log
          </Button>
        </div>

        {auditLogs.length === 0 ? (
          <EmptyState
            title="No audit logs recorded"
            description="System activity and security events will be logged here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '10px', backgroundColor: 'var(--color-neutral-50)', border: '1px solid var(--color-neutral-200)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{log.timestamp} • IP: {log.ipAddress}</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>{log.userName} ({log.userRole})</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-700)' }}>{log.details}</p>
                </div>
                <StatusBadge status={log.action} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
