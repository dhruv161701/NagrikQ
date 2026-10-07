import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { ServiceCard } from '../../components/government/ServiceCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

export const UserServicesPage: React.FC = () => {
  const { services, refreshServices } = useData();
  const { uiMode } = useUI();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filtered = services.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(query.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshServices();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
            Browse Government Services
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
            Select a service to check eligibility, view verified document requirements, and issue your virtual queue token.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} icon={<RefreshCw size={16} className={refreshing ? 'spin' : ''} />}>
          Refresh Services
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SearchBar value={query} onChange={setQuery} placeholder="Filter services by name, category or department code..." />

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: isSimple ? '10px 18px' : '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-neutral-300)'}`,
                backgroundColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-white)',
                color: selectedCategory === cat ? 'white' : 'var(--color-neutral-800)',
                fontWeight: 600,
                fontSize: isSimple ? '1rem' : '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {refreshing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Services Found"
          description={query ? `No government services match "${query}". Try another search term.` : 'No services available in this category.'}
          actionText="Clear Filters"
          onAction={() => {
            setQuery('');
            setSelectedCategory('ALL');
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filtered.map((srv) => (
            <ServiceCard key={srv.id} service={srv} onApply={() => navigate(`/services/${srv.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};
