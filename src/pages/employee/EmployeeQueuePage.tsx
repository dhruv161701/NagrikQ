import React from 'react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { QueueToken } from '../../types';
import { Play } from 'lucide-react';

export const EmployeeQueuePage: React.FC = () => {
  const { queueTokens, callNextToken, updateTokenStatus } = useData();
  const counterTokens = queueTokens.filter((q) => q.counterNumber === 'C-04');

  const columns: Column<QueueToken>[] = [
    { key: 'tokenNumber', header: 'Token', render: (row) => <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary-700)' }}>{row.tokenNumber}</span> },
    { key: 'citizenName', header: 'Citizen', render: (row) => <div><div style={{ fontWeight: 700 }}>{row.citizenName}</div><span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{row.citizenPhone}</span></div> },
    { key: 'serviceName', header: 'Service' },
    { key: 'issuedAt', header: 'Issued Time' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {row.status === 'WAITING' && (
            <Button variant="saffron" size="sm" onClick={() => updateTokenStatus(row.id, 'IN_SERVICE')}>
              Call Token
            </Button>
          )}
          {row.status === 'IN_SERVICE' && (
            <Button variant="primary" size="sm" onClick={() => updateTokenStatus(row.id, 'COMPLETED')}>
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Counter C-04 Live Queue Manager
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Full list of today's tokens assigned to Counter C-04.
          </p>
        </div>
        <Button variant="saffron" onClick={() => callNextToken('C-04')} icon={<Play size={18} />}>
          Call Next Citizen
        </Button>
      </div>

      <Table columns={columns} data={counterTokens} keyExtractor={(row) => row.id} />
    </div>
  );
};
