import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import type { AuditLog } from '../../types';

export const SuperAdminAuditLogsPage: React.FC = () => {
  const { auditLogs } = useData();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filtered = auditLogs.filter((l) => {
    const matchesSearch =
      l.userName.toLowerCase().includes(query.toLowerCase()) ||
      l.details.toLowerCase().includes(query.toLowerCase()) ||
      l.entity.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || l.userRole === roleFilter;
    const matchesAction = actionFilter === 'ALL' || l.action.includes(actionFilter);
    return matchesSearch && matchesRole && matchesAction;
  });

  const columns: Column<AuditLog>[] = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'userName', header: 'User Persona', render: (row) => <div><div style={{ fontWeight: 700 }}>{row.userName}</div><span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)', textTransform: 'capitalize' }}>{row.userRole}</span></div> },
    { key: 'action', header: 'Action Event', render: (row) => <Badge variant={row.action.includes('APPROVE') ? 'green' : row.action.includes('CREATE') ? 'blue' : 'orange'}>{row.action}</Badge> },
    { key: 'entity', header: 'Entity Target' },
    { key: 'details', header: 'Audit Details' },
    { key: 'ipAddress', header: 'IP' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          Global System Audit Trail & Compliance Log
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Realtime security audit log tracking administrative changes, token generation, and approval decisions.
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
        <SearchBar value={query} onChange={setQuery} placeholder="Filter audit logs by keyword, user, or entity..." />
        <Select
          label="Filter by User Role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Roles' },
            { value: 'citizen', label: 'Citizen' },
            { value: 'employee', label: 'Employee / Officer' },
            { value: 'admin', label: 'Mamlatdar Admin' },
            { value: 'superadmin', label: 'Super Admin' },
          ]}
        />
        <Select
          label="Filter by Action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Actions' },
            { value: 'CHANGE_REQUEST', label: 'Change Requests' },
            { value: 'TOKEN', label: 'Token Events' },
            { value: 'DOCUMENT', label: 'Document Events' },
          ]}
        />
      </div>

      <Table columns={columns} data={filtered} keyExtractor={(row) => row.id} />
    </div>
  );
};
