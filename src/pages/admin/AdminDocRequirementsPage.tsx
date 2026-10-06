import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchBar } from '../../components/ui/SearchBar';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, RefreshCw, FileCheck2 } from 'lucide-react';

export const AdminDocRequirementsPage: React.FC = () => {
  const { services, refreshServices } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshServices();
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.code.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Service Document Requirements Overview
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Current verified document lists per government service in the state registry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" onClick={handleRefresh} icon={<RefreshCw size={16} className={refreshing ? 'spin' : ''} />}>
            Refresh
          </Button>
          <Button variant="saffron" onClick={() => navigate('/admin/change-requests')} icon={<GitPullRequest size={18} />}>
            Propose Requirement Change
          </Button>
        </div>
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Search service document requirements by name, category or code..." />

      {filteredServices.length === 0 ? (
        <EmptyState
          title="No services found"
          description="No government services match your search or exist to display document requirements."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredServices.map((srv) => (
            <Card key={srv.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="blue">{srv.category}</Badge>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)', fontWeight: 600 }}>
                      CODE: {srv.code}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-neutral-900)', marginTop: '4px' }}>
                    {srv.name}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                    {srv.description}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/change-requests`)}
                  icon={<GitPullRequest size={16} />}
                >
                  Propose Change
                </Button>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)', textTransform: 'uppercase' }}>
                  Mandatory & Verified Documents ({srv.requiredDocuments?.length || 0}):
                </span>

                {(!srv.requiredDocuments || srv.requiredDocuments.length === 0) ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500)', fontStyle: 'italic', marginTop: '6px' }}>
                    No specific documents configured yet for this service.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {srv.requiredDocuments.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          backgroundColor: 'var(--color-primary-50)',
                          border: '1px solid var(--color-primary-200)',
                          color: 'var(--color-primary-800)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <FileCheck2 size={16} style={{ color: 'var(--color-primary-700)' }} />
                        <span>{d.name}</span>
                        {d.isRequired && (
                          <span style={{ color: 'var(--color-danger-600)', fontSize: '0.75rem', fontWeight: 800 }}>*</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
