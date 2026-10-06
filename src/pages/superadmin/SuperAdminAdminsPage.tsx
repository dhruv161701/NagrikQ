import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Plus, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';

interface StaffAdmin {
  id: string;
  employee_id: string;
  designation: string;
  department: string;
  district: string;
  taluka: string;
  phone: string;
  verification_ref?: string;
  status: string;
  created_at: string;
  profiles?: { full_name?: string; email?: string };
  full_name?: string;
  email?: string;
}

export const SuperAdminAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<StaffAdmin[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<StaffAdmin | null>(null);

  // Form State - Create
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 9876543210');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Jan Seva Office Administrator');
  const [department, setDepartment] = useState('Revenue Department');
  const [district, setDistrict] = useState('Rajkot');
  const [taluka, setTaluka] = useState('Rajkot City');
  const [officeName, setOfficeName] = useState('Rajkot Jan Seva Kendra');

  // Form State - Edit
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTaluka, setEditTaluka] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporaryPassword: string; employeeId?: string } | null>(null);

  const fetchAdmins = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/super-admin/admins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setAdmins(data.data);
        return;
      }

      // Direct Supabase fallback if API returns empty array or fails
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('*, profiles!user_id(full_name, email)')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (staffData && staffData.length > 0) {
        const formatted = staffData.map((row: any) => ({
          ...row,
          full_name: row.profiles?.full_name || row.full_name || 'Department Administrator',
          email: row.profiles?.email || row.email || '',
        }));
        setAdmins(formatted);
        return;
      }

      // Fallback query profiles table for role='admin'
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin');

      if (profData && profData.length > 0) {
        const formattedFromProfiles: StaffAdmin[] = profData.map((p: any) => ({
          id: p.id,
          employee_id: `ADM-${p.id.slice(0, 6).toUpperCase()}`,
          designation: 'District / Office Administrator',
          department: 'Revenue Department',
          district: p.district || 'Rajkot',
          taluka: 'Rajkot',
          phone: p.phone || '+91 9876543210',
          status: 'ACTIVE',
          created_at: p.created_at || new Date().toISOString(),
          full_name: p.full_name,
          email: p.email,
          verification_ref: 'NagrikQ@Admin',
        }));
        setAdmins(formattedFromProfiles);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.warn('Failed to fetch admins:', err);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !employeeId) {
      setError('Full Name, Official Email, and Employee ID are required.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/super-admin/create-admin', {
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
          department,
          district,
          taluka,
          officeName,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.credentials) {
        setCreatedCredentials({
          email: data.data.credentials.email,
          temporaryPassword: data.data.credentials.temporaryPassword,
          employeeId: data.data.admin?.employee_id || employeeId,
        });
        fetchAdmins();
      } else {
        setError(data.error?.message || 'Failed to create Admin account.');
      }
    } catch {
      setError('Network error occurred while creating Admin account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (admin: StaffAdmin) => {
    setEditingAdmin(admin);
    setEditFullName(admin.full_name || admin.profiles?.full_name || '');
    setEditDesignation(admin.designation || '');
    setEditDepartment(admin.department || '');
    setEditDistrict(admin.district || '');
    setEditTaluka(admin.taluka || '');
    setEditPhone(admin.phone || '');
    setEditStatus(admin.status || 'ACTIVE');
    setError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setError('');
    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/super-admin/admins/${editingAdmin.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editFullName,
          designation: editDesignation,
          department: editDepartment,
          district: editDistrict,
          taluka: editTaluka,
          phone: editPhone,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchAdmins();
      } else {
        setError(data.error?.message || 'Failed to update Admin details.');
      }
    } catch {
      setError('Network error occurred while updating Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove Admin account '${name}'? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        fetchAdmins();
      } else {
        alert(data.error?.message || 'Failed to remove Admin account.');
      }
    } catch {
      alert('Network error occurred while removing Admin account.');
    }
  };

  const columns: Column<StaffAdmin>[] = [
    {
      key: 'name',
      header: 'Admin Officer Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary-900)' }}>
            {row.full_name || row.profiles?.full_name || 'Department Administrator'}
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
            {row.email || row.profiles?.email || 'admin@nagrikq.org'}
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
              {row.verification_ref || 'NagrikQ@Admin'}
            </code>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation' },
    { key: 'department', header: 'Department' },
    { key: 'district', header: 'District / Jurisdiction' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={row.status === 'ACTIVE' ? 'green' : 'red'}>{row.status || 'Active'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditModal(row)}
            icon={<Edit size={14} />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteAdmin(row.id, row.full_name || row.profiles?.full_name || 'Admin')}
            icon={<Trash2 size={14} />}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            District & Office Administrators
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            System-level authority directory of authorized office administrators across government departments.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreatedCredentials(null);
            setError('');
            setIsModalOpen(true);
          }}
          icon={<Plus size={18} />}
        >
          Create New Admin Account
        </Button>
      </div>

      <Table
        columns={columns}
        data={admins}
        keyExtractor={(row) => row.id || row.employee_id}
        emptyMessage="No office administrators created yet. Click 'Create New Admin Account' to provision a department administrator."
      />

      {/* Create Admin Wizard Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create District / Office Administrator">
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
                <strong style={{ fontSize: '1rem' }}>Admin Account Successfully Created!</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  The new administrator has been registered in the database and granted IDP access.
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
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
                Official IDP Access Credentials:
              </div>
              {createdCredentials.employeeId && (
                <div style={{ fontSize: '0.9rem' }}>
                  Officer / Employee ID: <strong style={{ color: 'var(--color-primary-900)' }}>{createdCredentials.employeeId}</strong>
                </div>
              )}
              <div style={{ fontSize: '0.9rem' }}>
                Email / Login ID: <strong style={{ color: 'var(--color-primary-900)' }}>{createdCredentials.email}</strong>
              </div>
              <div style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Temporary IDP Password:</span>
                <code
                  style={{
                    backgroundColor: 'var(--color-white)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-neutral-400)',
                    fontWeight: 700,
                    color: 'var(--color-error-700)',
                    fontSize: '0.95rem',
                  }}
                >
                  {createdCredentials.temporaryPassword}
                </code>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600)', marginTop: '4px' }}>
                Note: Provide these credentials securely to the assigned officer. They must log in via the Official Admin Portal link.
              </div>
            </div>

            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Shri Rajesh Patel" required />
              <Input label="Official Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@nagrikq.org" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Officer/Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. ADM-2026-091" required />
              <Input label="Official Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Mamlatdar & Office Head" required />
              <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Revenue Department" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Rajkot" required />
              <Input label="Taluka / City" value={taluka} onChange={(e) => setTaluka(e.target.value)} placeholder="Rajkot City" required />
            </div>

            <Input label="Assigned Office Name" value={officeName} onChange={(e) => setOfficeName(e.target.value)} placeholder="Rajkot Jan Seva Kendra" required />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Provisioning Account...' : 'Create Admin Account'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Admin Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Admin Account Details">
        <form onSubmit={handleUpdateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          <Input label="Full Name" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Designation" value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} required />
            <Input label="Department" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="District" value={editDistrict} onChange={(e) => setEditDistrict(e.target.value)} required />
            <Input label="Taluka" value={editTaluka} onChange={(e) => setEditTaluka(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Official Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Account Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-neutral-300)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving Changes...' : 'Save Admin Details'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
