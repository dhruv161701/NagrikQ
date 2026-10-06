import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { ServiceCard } from '../../components/government/ServiceCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { MapPin, Building2 } from 'lucide-react';

const CATEGORIES = ['All', 'Certificates', 'Identity', 'Revenue', 'Social Welfare', 'Health & Urban'];
const DISTRICTS = ['All Districts', 'Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar'];

export const ServiceDiscoveryPage: React.FC = () => {
  const { services, offices } = useData();
  const { uiMode } = useUI();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedOfficeId, setSelectedOfficeId] = useState('All');

  // Filter offices by district
  const filteredOffices = offices.filter((off) => {
    if (selectedDistrict === 'All Districts') return true;
    return off.district === selectedDistrict || (off as any).city === selectedDistrict;
  });

  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <span style={{ color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Government Portal Directory
        </span>
        <h1 style={{ fontSize: isSimple ? '2.5rem' : '2rem', color: 'var(--color-primary-900)', marginTop: '4px' }}>
          Location-Aware Government Services
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '1rem', marginTop: '6px' }}>
          Select your administrative district to view services officially offered at your local office.
        </p>
      </div>

      {/* Location Bar & Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          backgroundColor: 'var(--color-white)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-neutral-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '6px' }}>
            <MapPin size={16} style={{ color: 'var(--color-accent-600)' }} /> Administrative District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setSelectedOfficeId('All');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-neutral-300)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-neutral-800)',
              backgroundColor: 'var(--color-white)',
            }}
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '6px' }}>
            <Building2 size={16} style={{ color: 'var(--color-accent-600)' }} /> Office / Seva Kendra
          </label>
          <select
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-neutral-300)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-neutral-800)',
              backgroundColor: 'var(--color-white)',
            }}
          >
            <option value="All">All Offices in Location</option>
            {filteredOffices.map((off) => (
              <option key={off.id} value={off.id}>
                {off.name} ({off.district})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by service name, certificate type, or document requirement..."
        />

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: isSimple ? '12px 20px' : '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: `1.5px solid ${selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-neutral-300)'}`,
                backgroundColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-white)',
                color: selectedCategory === cat ? 'var(--color-white)' : 'var(--color-neutral-800)',
                fontWeight: 600,
                fontSize: isSimple ? '1rem' : '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <EmptyState
          title="No services found"
          description="There are currently no active services matching your location and filter selection."
          actionText="Clear Location Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setSelectedDistrict('All Districts');
            setSelectedOfficeId('All');
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredServices.map((srv) => (
            <ServiceCard key={srv.id} service={srv} onApply={() => navigate(`/services/${srv.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};
