import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Users, FileText, Clock, GitPullRequest, ArrowRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { employees, applications, queueTokens, services } = useData();
  const navigate = useNavigate();
  const [dbChangeRequests, setDbChangeRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchCRs = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || '';
        const res = await fetch('/api/change-requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setDbChangeRequests(json.data);
            return;
          }
        }
        const { data } = await supabase
          .from('service_change_requests')
          .select('*, services(name, code)')
          .order('submitted_at', { ascending: false });
        if (data) setDbChangeRequests(data);
      } catch (e) {
        console.warn('Dashboard CR fetch error:', e);
      }
    };
    fetchCRs();
  }, []);

  const activeEmployees = employees.filter((e) => e.isActive).length;
  const waitingTokens = queueTokens.filter((q) => q.status === 'WAITING').length;
  const changeRequests = dbChangeRequests;
  const pendingCRs = changeRequests.filter((c) => c.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Office Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Departmental overview of active counters, service performance, and document requirement change requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={() => navigate('/admin/services')} icon={<FileText size={18} />}>
            Departmental Services Catalog
          </Button>
          <Button variant="saffron" onClick={() => navigate('/admin/change-requests')} icon={<GitPullRequest size={18} />}>
            Create Document Change Request
          </Button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Active Employees', value: activeEmployees, sub: 'Counters operational', icon: <Users size={24} />, color: 'var(--color-primary-700)' },
          { label: 'Applications Today', value: applications.length, sub: 'Submitted online', icon: <FileText size={24} />, color: 'var(--color-info-700)' },
          { label: 'People Waiting', value: waitingTokens, sub: 'In virtual queue', icon: <Clock size={24} />, color: 'var(--color-accent-600)' },
          { label: 'Active Services', value: services.length, sub: 'Department catalog', icon: <Shield size={24} />, color: 'var(--color-success-700)' },
          { label: 'Pending Change Requests', value: pendingCRs, sub: 'Awaiting Super Admin', icon: <GitPullRequest size={24} />, color: '#684A6B' },
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

      {/* RECENT CHANGE REQUESTS PREVIEW */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
              Recent Document Requirement Change Requests
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
              Change requests submitted by Mamlatdar Admin to Super Admin for official approval.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/change-requests')} icon={<ArrowRight size={16} />}>
            View All ({changeRequests.length})
          </Button>
        </div>

        {changeRequests.length === 0 ? (
          <EmptyState
            title="No change requests submitted"
            description="Propose document requirement modifications when needed."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {changeRequests.map((cr) => (
              <div
                key={cr.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-neutral-200)',
                  backgroundColor: 'var(--color-neutral-50)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                    {cr.request_number || cr.requestNumber}: {cr.services?.name || cr.serviceName || 'Service'}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                    Proposed addition: <strong>"{cr.added_document_name || cr.addedDocumentName}"</strong> • Submitted {new Date(cr.submitted_at || cr.submittedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <StatusBadge status={cr.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
