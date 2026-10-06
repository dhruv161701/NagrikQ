import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

export const EmployeeSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          Counter Officer Shift Settings
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Configure assigned counter, announcement speaker settings, and shift hours.
        </p>
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input label="Officer Name" value={currentUser?.name || ''} placeholder="Not logged in" readOnly />
        <Input label="Assigned Counter" value={(currentUser as any)?.counterNumber ? `Counter ${(currentUser as any).counterNumber}` : 'Counter C-04'} readOnly />
        <Input label="Office Location" value={(currentUser as any)?.officeName || 'Assigned Jan Seva Office'} readOnly />
        <Input label="Shift Duration" value="09:00 AM - 05:00 PM" readOnly />
      </Card>
    </div>
  );
};
