import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Users,
  Building,
  GitPullRequest,
  Shield,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonMetrics } from '../../components/ui/skeleton';

interface SystemAnalytics {
  totalCitizens: number;
  activeOffices: number;
  activeEmployees: number;
  totalServices: number;
  activeServices: number;
  pendingChangeRequests: number;
  applicationsToday: number;
}

interface RealAuditLog {
  id: string;
  actor_user_id?: string;
  actor_user_name?: string;
  actor_user_role?: string;
  action: string;
  entity_type?: string;
  details: string;
  created_at?: string;
  timestamp?: string;
}

export const SuperAdminDashboardPage: React.FC = () => {
  const { offices, employees, services, changeRequests: contextCRs, auditLogs: mockLogs } = useData();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [dbAuditLogs, setDbAuditLogs] = useState<RealAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/analytics/system', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAnalytics(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch system analytics:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (data && data.length > 0) {
        setDbAuditLogs(data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics(true);
    fetchAuditLogs();

    // Smooth background polling every 3 seconds without skeleton flicker
    const interval = setInterval(() => {
      fetchAnalytics(false);
      fetchAuditLogs();
    }, 3000);

    // Supabase Realtime channel for live updates
    const channel = supabase
      .channel('realtime_superadmin_dashboard_metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchAnalytics(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_change_requests' }, () => {
        fetchAnalytics(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAnalytics(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, () => {
        fetchAnalytics(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchAnalytics(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchAuditLogs();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const pendingRequests = contextCRs.filter((c) => c.status === 'PENDING');
  const pendingCount = analytics?.pendingChangeRequests ?? pendingRequests.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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
              <Activity size={14} /> LIVE REAL-TIME TELEMETRY
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '4px' }}>
            Super Admin Governance Dashboard
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.95rem' }}>
            System-wide oversight across all 36 Indian jurisdictions, district Jan Seva Kendras, and security audit trails.
          </p>
        </div>

        {pendingCount > 0 && (
          <Button
            variant="saffron"
            onClick={() => navigate('/super-admin/change-requests')}
            icon={<GitPullRequest size={18} />}
          >
            Review Pending Change Requests ({pendingCount})
          </Button>
        )}
      </div>

      {/* METRICS GRID */}
      {loading && analytics === null ? (
        <SkeletonMetrics count={5} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            {
              label: 'Total Registered Citizens',
              value: analytics?.totalCitizens ?? 0,
              sub: 'Authenticated Gujarat Residents',
              icon: <Users size={24} />,
              color: 'var(--color-primary-700)',
            },
            {
              label: 'Active Government Offices',
              value: analytics?.activeOffices ?? offices.length,
              sub: 'District Jan Seva Kendras',
              icon: <Building size={24} />,
              color: 'var(--color-info-700)',
            },
            {
              label: 'Active Counter Employees',
              value: analytics?.activeEmployees ?? employees.length,
              sub: 'Verified Staff Officers',
              icon: <Users size={24} />,
              color: 'var(--color-success-700)',
            },
            {
              label: 'State Services Catalog',
              value: analytics?.totalServices ?? services.length,
              sub: `${analytics?.activeServices ?? services.filter((s) => s.isActive).length} Active Services Live`,
              icon: <Shield size={24} />,
              color: 'var(--color-accent-600)',
            },
            {
              label: 'Pending Change Requests',
              value: pendingCount,
              sub: 'Requires Super Admin Approval',
              icon: <GitPullRequest size={24} />,
              color: 'var(--color-primary-700)',
            },
          ].map((m, idx) => (
            <Card key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                  {m.label}
                </span>
                <div style={{ color: m.color }}>{m.icon}</div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-neutral-900)' }}>
                {m.value}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{m.sub}</span>
            </Card>
          ))}
        </div>
      )}

      {/* PENDING CHANGE REQUEST REVIEW BANNER */}
      {pendingCount > 0 && (
        <Card
          style={{
            border: '2px solid var(--color-primary-700)',
            backgroundColor: 'var(--color-primary-50)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-700)', fontWeight: 700 }}>
              <GitPullRequest size={20} /> Action Required: {pendingCount} Change Request Pending Approval
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-neutral-700)', marginTop: '4px' }}>
              District Admins have proposed updating required documents on state services. Review submissions to approve or reject.
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
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
              Recent Real-Time Security Audit Trail
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500)' }}>
              Immutable audit logs tracking system changes and administrative operations
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/audit-logs')} icon={<ArrowRight size={16} />}>
            View Full System Audit Log
          </Button>
        </div>

        {dbAuditLogs.length === 0 && mockLogs.length === 0 ? (
          <EmptyState
            title="No audit logs recorded"
            description="System activity and security events will be logged here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(dbAuditLogs.length > 0 ? dbAuditLogs : (mockLogs as any[])).slice(0, 5).map((log: any) => (
              <div
                key={log.id}
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
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : log.timestamp || 'Recent'}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-neutral-900)', marginTop: '2px' }}>
                    {log.actor_user_name || log.userName || 'Super Admin'} ({log.actor_user_role || log.userRole || 'superadmin'})
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--color-neutral-700)', margin: '2px 0 0 0' }}>
                    {log.details}
                  </p>
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
