import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';

interface StaffEmployee {
  id: string;
  employee_id: string;
  designation: string;
  department: string;
  district: string;
  taluka: string;
  office_id?: string;
  counter_id?: string;
  counter_number?: string;
  phone: string;
  aadhaar_last4?: string;
  verification_ref?: string;
  status: string;
  full_name?: string;
  email?: string;
  profiles?: { full_name?: string; email?: string };
}

export const AdminEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<StaffEmployee[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone] = useState('+91 9876543210');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Junior Verification Officer');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [counterNumber, setCounterNumber] = useState('C-01');
  const [department] = useState('Revenue Department');
  const [district, setDistrict] = useState('Rajkot');
  const [taluka, setTaluka] = useState('Rajkot City');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const fetchEmployees = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/admin/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch employees:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !employeeId) {
      setError('Full Name, Official Email, and Employee ID are required.');
      return;
    }

    if (aadhaarLast4 && aadhaarLast4.length !== 4) {
      setError('Aadhaar Last 4 Digits must be exactly 4 numeric digits.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          employeeId,
          designation,
          aadhaarLast4,
          aadhaarVerified: !!aadhaarLast4,
          counterNumber,
          department,
          district,
          taluka,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.credentials) {
        setCreatedCredentials(data.data.credentials);
        fetchEmployees();
      } else {
        setError(data.error?.message || 'Failed to create Employee account.');
      }
    } catch {
      setError('Network error occurred while creating Employee account.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<StaffEmployee>[] = [
    {
      key: 'name',
      header: 'Employee Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary-900)' }}>
            {row.full_name || row.profiles?.full_name || 'Verification Officer'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
            ID: {row.employee_id}
          </div>
        </div>
      ),
    },
    {
      key: 'credentials',
      header: 'IDP Credentials (ID / Password)',
      render: (row) => (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
            {row.email || row.profiles?.email || 'officer@nagrikq.org'}
          </div>
          <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-600)' }}>Pass:</span>
            <code
              style={{
                backgroundColor: 'var(--color-neutral-100)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--color-neutral-300)',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-error-700)',
              }}
            >
              {row.verification_ref || 'NagrikQ@Officer'}
            </code>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation' },
    {
      key: 'counter_number',
      header: 'Assigned Counter',
      render: (row) => <Badge variant="blue">{row.counter_number || 'C-01'}</Badge>,
    },
    {
      key: 'aadhaar_last4',
      header: 'Aadhaar Verification',
      render: (row) =>
        row.aadhaar_last4 ? (
          <Badge variant="green">XXXX-XXXX-{row.aadhaar_last4}</Badge>
        ) : (
          <Badge variant="neutral">Not Linked</Badge>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'ACTIVE' ? 'green' : 'red'}>{row.status || 'Active'}</Badge>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Counter Staff & Employee Management
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Provision office verification counter staff, manage shifts, and assign counter permissions.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreatedCredentials(null);
            setError('');
            setIsAddModalOpen(true);
          }}
          icon={<Plus size={18} />}
        >
          Add Counter Officer
        </Button>
      </div>

      <Table
        columns={columns}
        data={employees}
        keyExtractor={(row) => row.id || row.employee_id}
        emptyMessage="No counter employees created yet. Click 'Add Counter Officer' to provision an employee account."
      />

      {/* Create Employee Wizard Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Counter Officer Account">
        {createdCredentials ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '12px 0' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle size={24} />
              <div>
                <strong style={{ fontSize: '1rem' }}>Employee Account Successfully Created!</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  The employee officer has been provisioned and assigned IDP login access.
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-neutral-100)',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid var(--color-neutral-300)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                Official Officer IDP Credentials:
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                Email: <strong style={{ color: 'var(--color-primary-900)' }}>{createdCredentials.email}</strong>
              </div>
              <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Temporary Password:</span>
                <code
                  style={{
                    backgroundColor: 'var(--color-white)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-neutral-400)',
                    fontWeight: 700,
                    color: 'var(--color-error-700)',
                  }}
                >
                  {createdCredentials.temporaryPassword}
                </code>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                Note: Provide these credentials securely to the employee officer.
              </div>
            </div>

            <Button variant="primary" onClick={() => setIsAddModalOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-error-100)',
                  color: 'var(--color-error-700)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Officer Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Shri Ankit Trivedi" required />
              <Input label="Official Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="officer@nagrikq.gov.in" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Employee ID Code" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. EMP-2026-088" required />
              <Input label="Assigned Counter" value={counterNumber} onChange={(e) => setCounterNumber(e.target.value)} placeholder="e.g. C-01" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Junior Verification Officer" required />
              <Input
                label="Aadhaar Last 4 Digits (Optional)"
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value)}
                placeholder="4321"
                maxLength={4}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Rajkot" required />
              <Input label="Taluka / City" value={taluka} onChange={(e) => setTaluka(e.target.value)} placeholder="Rajkot City" required />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating Officer...' : 'Create Employee Account'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
