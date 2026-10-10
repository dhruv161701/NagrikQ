import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { AuditLog } from '../../types';
import {
  History,
  Inbox,
  List,
  RefreshCw,
  Shield,
  FileText,
  Users,
  GitPullRequest,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SuperAdminAuditLogsPage: React.FC = () => {
  const { auditLogs, refreshAuditLogs } = useData();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SERVICES' | 'STAFF' | 'CHANGES' | 'QUEUE'>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'inbox' | 'table'>('inbox');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuditLogs();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getEventCategory = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('SERVICE') || act.includes('BOOKING')) return 'SERVICES';
    if (act.includes('EMPLOYEE') || act.includes('ADMIN') || act.includes('ACCOUNT') || act.includes('STAFF')) return 'STAFF';
    if (act.includes('CHANGE_REQUEST')) return 'CHANGES';
    if (act.includes('QUEUE') || act.includes('APPLICATION') || act.includes('TOKEN')) return 'QUEUE';
    return 'OTHER';
  };

  const getActionBadgeColor = (action: string): 'green' | 'blue' | 'orange' | 'red' | 'neutral' => {
    const act = action.toUpperCase();
    if (act.includes('APPROVE') || act.includes('CREATE') || act.includes('RESUME')) return 'green';
    if (act.includes('UPDATE') || act.includes('CALL')) return 'blue';
    if (act.includes('CHANGE') || act.includes('STOP') || act.includes('TOGGLE')) return 'orange';
    if (act.includes('DELETE') || act.includes('REJECT') || act.includes('REMOVE')) return 'red';
    return 'neutral';
  };

  const getActionIcon = (action: string) => {
    const cat = getEventCategory(action);
    if (cat === 'SERVICES') return <FileText size={18} color="#0284c7" />;
    if (cat === 'STAFF') return <Users size={18} color="#7c3aed" />;
    if (cat === 'CHANGES') return <GitPullRequest size={18} color="#ea580c" />;
    if (cat === 'QUEUE') return <Clock size={18} color="#059669" />;
    return <History size={18} color="#475569" />;
  };

  const formatRelativeTime = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return timestampStr;
    }
  };

  const filtered = auditLogs.filter((l) => {
    const q = query.toLowerCase();
    const matchesSearch =
      l.userName.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'ALL' || l.userRole.toLowerCase() === roleFilter.toLowerCase();
    const cat = getEventCategory(l.action);
    const matchesCat = categoryFilter === 'ALL' || cat === categoryFilter;
    return matchesSearch && matchesRole && matchesCat;
  });

  const totalServicesEvents = auditLogs.filter((l) => getEventCategory(l.action) === 'SERVICES').length;
  const totalStaffEvents = auditLogs.filter((l) => getEventCategory(l.action) === 'STAFF').length;
  const totalChangeEvents = auditLogs.filter((l) => getEventCategory(l.action) === 'CHANGES').length;

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {new Date(row.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
            {new Date(row.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'userName',
      header: 'Actor Persona',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary-900)' }}>{row.userName}</div>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-neutral-100)',
              color: 'var(--color-neutral-700)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {row.userRole}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Event',
      render: (row) => <Badge variant={getActionBadgeColor(row.action)}>{row.action}</Badge>,
    },
    {
      key: 'entity',
      header: 'Entity Target',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
          {row.entity}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Audit Details',
      render: (row) => (
        <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-800)', maxWidth: '420px', lineHeight: 1.4 }}>
          {row.details}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'Actions',
      render: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedLog(row)}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Live Real-time Indicator & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', fontWeight: 800 }}>
              System Audit Logs & Live Activity Inbox
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 2px #d1fae5',
                }}
              />
              Live Supabase Stream Active
            </span>
          </div>
          <p style={{ color: 'var(--color-neutral-600)', margin: 0, fontSize: '0.92rem' }}>
            Comprehensive, tamper-evident record of all global service creations, administrative changes, and workflow approvals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--color-neutral-100)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              onClick={() => setViewMode('inbox')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'inbox' ? 'white' : 'transparent',
                color: viewMode === 'inbox' ? 'var(--color-primary-800)' : 'var(--color-neutral-600)',
                fontWeight: viewMode === 'inbox' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'inbox' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Inbox size={15} /> Activity Inbox
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? 'white' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-primary-800)' : 'var(--color-neutral-600)',
                fontWeight: viewMode === 'table' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <List size={15} /> Ledger Table
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Syncing...' : 'Refresh Logs'}
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-500)' }}>Total Audit Logs</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <History size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '8px' }}>
            {auditLogs.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600 }}>Realtime immutable entries</span>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-500)' }}>Service Operations</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#15803d' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '8px' }}>
            {totalServicesEvents}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500)' }}>Creation, update, booking controls</span>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-500)' }}>Staff & Admin Events</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#faf5ff', color: '#7e22ce' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '8px' }}>
            {totalStaffEvents}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500)' }}>Provisioning, roles & counters</span>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-500)' }}>Change Requests</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#c2410c' }}>
              <GitPullRequest size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-900)', marginTop: '8px' }}>
            {totalChangeEvents}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500)' }}>Proposals, reviews & rulings</span>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'var(--color-bg-card)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Activity Feed', count: auditLogs.length },
            { id: 'SERVICES', label: 'Services & Catalog', count: totalServicesEvents },
            { id: 'STAFF', label: 'Staff & Admins', count: totalStaffEvents },
            { id: 'CHANGES', label: 'Change Requests', count: totalChangeEvents },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: categoryFilter === cat.id ? 700 : 500,
                border: categoryFilter === cat.id ? '1px solid var(--color-primary-600)' : '1px solid var(--color-border)',
                backgroundColor: categoryFilter === cat.id ? 'var(--color-primary-50)' : 'var(--color-bg-page)',
                color: categoryFilter === cat.id ? 'var(--color-primary-800)' : 'var(--color-neutral-700)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  backgroundColor: categoryFilter === cat.id ? 'var(--color-primary-200)' : 'var(--color-neutral-200)',
                  color: categoryFilter === cat.id ? 'var(--color-primary-900)' : 'var(--color-neutral-700)',
                }}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search by action event, actor name, target entity, or details..."
          />
          <Select
            label=""
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Filter by Persona: All' },
              { value: 'superadmin', label: 'Super Admin' },
              { value: 'admin', label: 'Mamlatdar Office Admin' },
              { value: 'employee', label: 'Counter Employee' },
              { value: 'citizen', label: 'Citizen Applicant' },
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'inbox' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: '12px',
                border: '1px dashed var(--color-border)',
              }}
            >
              <Inbox size={42} color="var(--color-neutral-400)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                No audit events match your filter
              </h3>
              <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.88rem', maxWidth: '400px', margin: '4px auto 16px' }}>
                Try adjusting your search criteria or reset category filters to view all system activity.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setCategoryFilter('ALL');
                  setRoleFilter('ALL');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            filtered.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                }}
              >
                {/* Event Icon Avatar */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-neutral-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {getActionIcon(log.action)}
                </div>

                {/* Event Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant={getActionBadgeColor(log.action)}>{log.action}</Badge>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        Target: {log.entity}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-neutral-500)', fontSize: '0.78rem' }}>
                      <Clock size={13} />
                      <span title={new Date(log.timestamp).toLocaleString()}>{formatRelativeTime(log.timestamp)}</span>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: '6px 0 8px',
                      fontSize: '0.92rem',
                      color: 'var(--color-neutral-900)',
                      fontWeight: 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {log.details}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                    <span>
                      Triggered by: <strong style={{ color: 'var(--color-primary-900)' }}>{log.userName}</strong> (
                      <span style={{ textTransform: 'capitalize' }}>{log.userRole}</span>)
                    </span>
                    <span>•</span>
                    <span>Exact Time: {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} />
        </div>
      )}

      {/* Detailed Modal on Inspect */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Security Audit Record Details">
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <Badge variant={getActionBadgeColor(selectedLog.action)}>{selectedLog.action}</Badge>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
                  Log Record ID: {selectedLog.id}
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
                {new Date(selectedLog.timestamp).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-neutral-50)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Actor Identity</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary-900)' }}>{selectedLog.userName}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600)', textTransform: 'capitalize' }}>
                  Role: {selectedLog.userRole}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-neutral-50)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', display: 'block' }}>Entity Target</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary-900)' }}>{selectedLog.entity}</strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600)' }}>
                  User ID: {selectedLog.userId || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Complete Audit Log Description & Payload
              </span>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.5 }}>
                {selectedLog.details}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Close Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
