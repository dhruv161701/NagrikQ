import React from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Building, MapPin } from 'lucide-react';

export const SuperAdminOfficesPage: React.FC = () => {
  const { offices } = useData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          State Government Offices Directory
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Registered Jan Seva Kendras, Collectorates, and Mamlatdar offices connected to NagrikQ.
        </p>
      </div>

      {offices.length === 0 ? (
        <EmptyState
          title="No offices available"
          description="No state government offices registered in the database."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {offices.map((off) => (
            <Card key={off.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
                  <Building size={22} />
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--color-neutral-900)' }}>{off.name}</h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> {off.address}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-neutral-200)', paddingTop: '10px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-700)' }}>{off.totalCounters} Operational Counters</span>
                <span style={{ color: 'var(--color-neutral-600)' }}>{off.contactNumber}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
