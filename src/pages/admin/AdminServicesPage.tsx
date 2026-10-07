import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/skeleton';
import { Plus, GitPullRequest, Search, Clock, CheckCircle2, AlertCircle, Edit } from 'lucide-react';

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  processing_time_days: number;
  fee_amount: number;
  is_active: boolean;
}

const STANDARD_INDIAN_DOCUMENTS = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID Card (EPIC)',
  'Ration Card (APL / BPL / AAY)',
  'Passport',
  'Driving License',
  'Income Certificate (Issued by Tehsildar/Mamlatdar)',
  'Caste Certificate (SC / ST / OBC / SEBC)',
  'Non-Creamy Layer (NCL) Certificate',
  'Domicile / Residence Certificate',
  'Birth Certificate',
  'Death Certificate',
  'Marriage Certificate',
  '7/12 Extract & 8A Land Record (Satbara Utara)',
  'Property Tax Receipt / Index II',
  'Form 16 / Salary Certificate / Income Tax Return (ITR)',
  'Bank Passbook / Statement (Last 6 Months)',
  'Electricity Bill (Recent 3 Months)',
  'Water Connection Bill',
  'LPG Gas Connection Booklet / Bill',
  'Disability Certificate / UDID Card',
  'Educational Marksheet / Passing Certificate (SSC/HSC/Degree)',
  'Passport Size Photograph (Recent Color Photo)',
  'Self-Declaration Affidavit (Notarized / Stamp Paper)',
  'Senior Citizen Identity Card',
  'Farmers Khatauni / Land Ownership Certificate',
  'Pension Passbook / PPO Number',
  'School Leaving Certificate / Transfer Certificate (LC/TC)',
  'Business Registration / Shop Act License / GST Registration',
  'EWS (Economically Weaker Section) Income & Asset Certificate',
  'NOC (No Objection Certificate) from Local Authority',
  'Medical Fitness Certificate (Registered Medical Practitioner)',
  'Solvency Certificate',
  'Other / Custom Document (Specify Manually)',
];

export const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Change Request Modal State
  const [isCRModalOpen, setIsCRModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [docPreset, setDocPreset] = useState(STANDARD_INDIAN_DOCUMENTS[0]);
  const [addedDocName, setAddedDocName] = useState(STANDARD_INDIAN_DOCUMENTS[0]);
  const [reason, setReason] = useState('');
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [crError, setCrError] = useState('');
  const [crSuccess, setCrSuccess] = useState(false);

  // Edit Service Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProcessingDays, setEditProcessingDays] = useState(7);
  const [editFeeAmount, setEditFeeAmount] = useState(0);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setEditName(service.name);
    setEditCategory(service.category);
    setEditDescription(service.description);
    setEditProcessingDays(service.processing_time_days);
    setEditFeeAmount(service.fee_amount);
    setEditSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      setEditSubmitting(true);
      const { error } = await supabase
        .from('services')
        .update({
          name: editName,
          category: editCategory,
          description: editDescription,
          processing_time_days: editProcessingDays,
          fee_amount: editFeeAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingService.id);

      if (error) throw error;

      setEditSuccessMsg('Service details successfully updated!');
      fetchServices();
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to update service details.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setServices(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 2500);

    const channel = supabase
      .channel('realtime_admin_services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requirements' }, () => {
        fetchServices();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenCRModal = (serviceId?: string) => {
    setSelectedServiceId(serviceId || (services[0]?.id || ''));
    setDocPreset(STANDARD_INDIAN_DOCUMENTS[0]);
    setAddedDocName(STANDARD_INDIAN_DOCUMENTS[0]);
    setReason('');
    setCrError('');
    setCrSuccess(false);
    setIsCRModalOpen(true);
  };

  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrError('');

    if (!addedDocName || !reason) {
      setCrError('Document Name and Reason for Change Request are required.');
      return;
    }

    setCrSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const targetService = services.find((s) => s.id === selectedServiceId) || services[0];

      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: targetService?.id,
          officeName: 'Rajkot Jan Seva Kendra',
          addedDocumentName: addedDocName,
          reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCrSuccess(true);
      } else {
        setCrError(data.error?.message || 'Failed to submit Change Request.');
      }
    } catch {
      setCrError('Network error occurred while submitting Change Request.');
    } finally {
      setCrSubmitting(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Departmental Services Catalog
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Manage available government public services, processing guidelines, and proposed document change requests.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={() => handleOpenCRModal()}
            icon={<GitPullRequest size={18} />}
          >
            Submit Service Change Request
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--color-white)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-neutral-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ color: 'var(--color-neutral-400)' }} />
          <Input
            type="text"
            placeholder="Search catalog by service name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', boxShadow: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-neutral-300)',
                backgroundColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-white)',
                color: selectedCategory === cat ? 'white' : 'var(--color-neutral-700)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Service Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title="No departmental services found"
          description="No government services match your filter criteria."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-neutral-200)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge variant="neutral">{srv.category}</Badge>
                    <Badge variant={srv.is_active ? 'green' : 'neutral'}>
                      {srv.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-neutral-500)', letterSpacing: '0.5px' }}>
                  {srv.code}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary-900)', marginTop: '2px', lineHeight: 1.3 }}>
                  {srv.name}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', marginTop: '8px', lineHeight: 1.5 }}>
                  {srv.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-neutral-100)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} style={{ color: 'var(--color-primary-700)' }} /> SLA Time:
                  </span>
                  <strong style={{ color: 'var(--color-neutral-900)' }}>{srv.processing_time_days} Working Days</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>
                  <span>Government Fee:</span>
                  <strong style={{ color: 'var(--color-success-700)' }}>
                    {srv.fee_amount > 0 ? `₹${srv.fee_amount}` : 'Free / No Fee'}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEditModal(srv)}
                    icon={<Edit size={14} />}
                    style={{ flex: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCRModal(srv.id)}
                    icon={<Plus size={14} />}
                    style={{ flex: 2 }}
                  >
                    Propose Change
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Change Request Modal */}
      <Modal isOpen={isCRModalOpen} onClose={() => setIsCRModalOpen(false)} title="Submit Service Change Request">
        {crSuccess ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
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
              <CheckCircle2 size={24} />
              <div>
                <strong style={{ fontSize: '1rem' }}>Change Request Submitted!</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  Your proposed document requirement change has been forwarded to the Super Admin for approval.
                </div>
              </div>
            </div>
            <Button variant="primary" onClick={() => setIsCRModalOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {crError && (
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
                <span>{crError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Target Government Service
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-neutral-300)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                }}
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} ({srv.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Proposed Required Document Name
              </label>
              <select
                value={docPreset}
                onChange={(e) => {
                  setDocPreset(e.target.value);
                  if (e.target.value !== 'Other / Custom Document (Specify Manually)') {
                    setAddedDocName(e.target.value);
                  } else {
                    setAddedDocName('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-neutral-300)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                  marginBottom: docPreset === 'Other / Custom Document (Specify Manually)' ? '8px' : '0',
                }}
              >
                {STANDARD_INDIAN_DOCUMENTS.map((docName) => (
                  <option key={docName} value={docName}>
                    {docName}
                  </option>
                ))}
              </select>

              {docPreset === 'Other / Custom Document (Specify Manually)' && (
                <Input
                  placeholder="Type Custom Document Name..."
                  value={addedDocName}
                  onChange={(e) => setAddedDocName(e.target.value)}
                  required
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Reason for Proposed Change
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this document requirement is needed for service processing..."
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-neutral-300)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <Button type="button" variant="outline" onClick={() => setIsCRModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={crSubmitting}>
                {crSubmitting ? 'Submitting Request...' : 'Submit to Super Admin'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* EDIT SERVICE DETAILS MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!editSubmitting) setIsEditModalOpen(false);
        }}
        title={`Edit Service Details: ${editingService?.name}`}
      >
        <form onSubmit={handleSaveEditService} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editSuccessMsg && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{editSuccessMsg}</span>
            </div>
          )}

          <Input
            label="Service Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <Input
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                SLA Processing Time (Days)
              </label>
              <Input
                type="number"
                min="1"
                value={editProcessingDays}
                onChange={(e) => setEditProcessingDays(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                Service Fee (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editFeeAmount}
                onChange={(e) => setEditFeeAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
              Service Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-neutral-300)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-neutral-200)' }}>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={editSubmitting}>
              {editSubmitting ? 'Saving Changes...' : 'Save Service Details'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
