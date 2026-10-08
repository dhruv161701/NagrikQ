import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CheckSquare, Square, ShieldCheck, CheckCircle } from 'lucide-react';

export const EmployeeSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { services } = useData();

  const empStorageKey = currentUser?.id ? `nagrikq_emp_services_${currentUser.id}` : 'nagrikq_emp_services_default';

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(empStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return services.map((s) => s.id);
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (services.length > 0) {
      try {
        const saved = localStorage.getItem(empStorageKey);
        if (!saved) {
          const allIds = services.map((s) => s.id);
          setSelectedServiceIds(allIds);
          localStorage.setItem(empStorageKey, JSON.stringify(allIds));
        }
      } catch {
        // Ignore
      }
    }
  }, [services, empStorageKey]);

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const updated = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      localStorage.setItem(empStorageKey, JSON.stringify(updated));
      return updated;
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSelectAll = () => {
    const allIds = services.map((s) => s.id);
    setSelectedServiceIds(allIds);
    localStorage.setItem(empStorageKey, JSON.stringify(allIds));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClearAll = () => {
    setSelectedServiceIds([]);
    localStorage.setItem(empStorageKey, JSON.stringify([]));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          Counter Officer Shift & Service Settings
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Configure assigned counter information and designate the government services you process during your shift.
        </p>
      </div>

      {saveSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-green-50)',
            border: '1px solid var(--color-green-300)',
            color: 'var(--color-green-800)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle size={18} /> Service desk assignments updated successfully.
        </div>
      )}

      {/* Profile & Counter Overview */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)', fontWeight: 700 }}>
          Counter Station Information
        </h3>
        <Input label="Officer Name" value={currentUser?.name || ''} placeholder="Not logged in" readOnly />
        <Input label="Email / ID" value={currentUser?.email || ''} readOnly />
        <Input
          label="Assigned Counter"
          value={(currentUser as any)?.counterNumber ? `Counter ${(currentUser as any).counterNumber}` : 'Counter C-04'}
          readOnly
        />
        <Input label="Office Location" value={(currentUser as any)?.officeName || 'Assigned Jan Seva Office'} readOnly />
        <Input label="Shift Duration" value="09:00 AM - 05:00 PM" readOnly />
      </Card>

      {/* Service Responsibility Checkboxes */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--color-primary-700)" />
              Assigned Service Responsibilities ({selectedServiceIds.length}/{services.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
              Only citizens waiting for your checked services will be routed to your queue when you click "Call Next Citizen".
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="outline" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="sm" variant="secondary" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', marginTop: '6px' }}>
          {services.map((srv) => {
            const isChecked = selectedServiceIds.includes(srv.id);
            return (
              <div
                key={srv.id}
                onClick={() => handleToggleService(srv.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: `1.5px solid ${isChecked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)'}`,
                  backgroundColor: isChecked ? 'var(--color-primary-50)' : 'var(--color-neutral-50)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {isChecked ? (
                  <CheckSquare size={18} color="var(--color-primary-700)" />
                ) : (
                  <Square size={18} color="var(--color-neutral-400)" />
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? 700 : 500, color: isChecked ? 'var(--color-neutral-900)' : 'var(--color-neutral-600)' }}>
                    {srv.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                    {srv.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
