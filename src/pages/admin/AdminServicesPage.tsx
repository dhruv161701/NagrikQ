import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/skeleton';
import {
  GitPullRequest,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  IndianRupee,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  is_required?: boolean;
}

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  processing_time_days: number;
  fee_amount: number;
  is_active: boolean;
  document_requirements?: DocumentRequirement[];
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
  const navigate = useNavigate();
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

  const fetchServices = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Admin only views active services
        setServices(data.data.filter((s: any) => s.is_active !== false));
      }
    } catch (err) {
      console.warn('Failed to fetch services:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices(true);
    const interval = setInterval(() => fetchServices(false), 3000);

    const channel = supabase
      .channel('realtime_admin_services_merged')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requirements' }, () => {
        fetchServices(false);
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
      setCrError('Document Name and Justification Reason are required.');
      return;
    }

    try {
      setCrSubmitting(true);
      const targetService = services.find((s) => s.id === selectedServiceId);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          serviceName: targetService?.name || 'Department Service',
          officeName: 'District Admin Desk',
          currentDocumentNames: targetService?.document_requirements?.map((d) => d.name) || [],
          proposedDocumentNames: [
            ...(targetService?.document_requirements?.map((d) => d.name) || []),
            addedDocName,
          ],
          addedDocumentName: addedDocName,
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit change request.');
      }

      setCrSuccess(true);
      setTimeout(() => {
        setIsCRModalOpen(false);
        setCrSuccess(false);
      }, 1500);
    } catch (err: any) {
      setCrError(err.message || 'Submission failed.');
    } finally {
      setCrSubmitting(false);
    }
  };

  // Filter Categories
  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-800)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid var(--color-primary-200)',
              }}
            >
              <ShieldCheck size={14} /> District Administration • Verified Standards
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
            Services Catalog & Document Requirements
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px', fontSize: '0.95rem' }}>
            Inspect departmental government services and verified document requirements. To modify requirements, submit a formal Change Request to the State Super Admin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="saffron"
            onClick={() => handleOpenCRModal()}
            icon={<GitPullRequest size={18} />}
          >
            Propose Document Change
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/change-requests')}
            icon={<FileText size={18} />}
          >
            View Change Requests
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: '14px',
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-neutral-400)',
            }}
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search active services by name, department code or description..."
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-600)', marginRight: '4px' }}>
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: selectedCategory === cat ? '1px solid var(--color-primary-700)' : '1px solid var(--color-border)',
                backgroundColor: selectedCategory === cat ? 'var(--color-primary-700)' : 'var(--color-bg-page)',
                color: selectedCategory === cat ? 'white' : 'var(--color-neutral-700)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'ALL' ? `All Active (${services.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services and Document Requirements Grid */}
      {loading && services.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title="No Matching Government Services Found"
          description="Try modifying your search or selecting a different category filter."
          actionText="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('ALL');
          }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge variant="neutral">{srv.code}</Badge>
                    <Badge variant="info">{srv.category}</Badge>
                  </div>
                  <Badge variant="success">ACTIVE</Badge>
                </div>

                {/* Service Title */}
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-900)', margin: 0 }}>
                    {srv.name}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--color-neutral-600)',
                      marginTop: '6px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {srv.description}
                  </p>
                </div>

                {/* SLA and Fee Row */}
                <div style={{ display: 'flex', gap: '18px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'var(--color-bg-page)', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-neutral-700)' }}>
                    <Clock size={16} style={{ color: 'var(--color-accent-600)' }} />
                    <span>SLA: <strong>{srv.processing_time_days} Days</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-neutral-700)' }}>
                    <IndianRupee size={16} style={{ color: 'var(--color-success-600)' }} />
                    <span>Fee: <strong>{srv.fee_amount > 0 ? `₹${srv.fee_amount.toFixed(2)}` : 'FREE'}</strong></span>
                  </div>
                </div>

                {/* Mandatory Document Requirements Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                    <FileCheck size={16} style={{ color: 'var(--color-primary-700)' }} />
                    <span>Mandatory Document Proofs ({srv.document_requirements?.length || 0}):</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {srv.document_requirements && srv.document_requirements.length > 0 ? (
                      srv.document_requirements.map((doc) => (
                        <span
                          key={doc.id || doc.name}
                          style={{
                            fontSize: '0.78rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--color-bg-page)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-neutral-800)',
                            fontWeight: 600,
                          }}
                        >
                          {doc.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>
                        No specific documents configured in registry
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer: Only "Propose Document Change" action */}
              <div
                style={{
                  paddingTop: '14px',
                  borderTop: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                  State Registry Standard
                </span>

                <Button
                  variant="saffron"
                  size="sm"
                  onClick={() => handleOpenCRModal(srv.id)}
                  icon={<GitPullRequest size={15} />}
                >
                  Propose Document Change
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PROPOSE DOCUMENT CHANGE REQUEST MODAL */}
      <Modal
        isOpen={isCRModalOpen}
        onClose={() => {
          if (!crSubmitting) setIsCRModalOpen(false);
        }}
        title="Propose Document Requirement Change"
      >
        <form onSubmit={handleSubmitChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {crError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-50)',
                border: '1px solid var(--color-danger-200)',
                color: 'var(--color-danger-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={18} /> {crError}
            </div>
          )}

          {crSuccess && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-green-50)',
                border: '1px solid var(--color-green-300)',
                color: 'var(--color-green-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} /> Change Request Submitted to Super Admin!
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
              Select Target Service <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
              required
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code} • {s.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
              Standard Document Preset <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={docPreset}
              onChange={(e) => {
                const val = e.target.value;
                setDocPreset(val);
                if (val !== 'Other / Custom Document (Specify Manually)') {
                  setAddedDocName(val);
                } else {
                  setAddedDocName('');
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                fontSize: '0.9rem',
              }}
            >
              {STANDARD_INDIAN_DOCUMENTS.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          </div>

          {docPreset === 'Other / Custom Document (Specify Manually)' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Custom Document Name <span style={{ color: 'red' }}>*</span>
              </label>
              <Input
                value={addedDocName}
                onChange={(e) => setAddedDocName(e.target.value)}
                placeholder="e.g. Gram Panchayat NOC / Succession Certificate"
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
              Official Justification / Reason <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this document is necessary (e.g. State Revenue Act 2026 update, fraud prevention, district gazette notification)..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCRModalOpen(false)}
              disabled={crSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="saffron"
              disabled={crSubmitting}
              icon={<GitPullRequest size={16} />}
            >
              {crSubmitting ? 'Submitting...' : 'Submit to Super Admin'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
