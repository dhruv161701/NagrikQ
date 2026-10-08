import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { GitPullRequest, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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

interface ChangeRequestItem {
  id: string;
  request_number: string;
  service_id: string;
  service_name?: string;
  office_name: string;
  added_document_name: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_note?: string;
  submitted_at: string;
  reviewed_at?: string;
  current_document_names?: string[];
  proposed_document_names?: string[];
  services?: { name?: string; code?: string };
}

export const AdminChangeRequestsPage: React.FC = () => {
  const { services } = useData();

  const [changeRequests, setChangeRequests] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [docPreset, setDocPreset] = useState(STANDARD_INDIAN_DOCUMENTS[0]);
  const [newDocName, setNewDocName] = useState(STANDARD_INDIAN_DOCUMENTS[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Keep selectedServiceId updated if services load later
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const targetService = services.find((s) => s.id === selectedServiceId) || services[0];

  const fetchChangeRequests = useCallback(async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/change-requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const responseData = await res.json();
        if (responseData.success && Array.isArray(responseData.data)) {
          setChangeRequests(responseData.data);
          return;
        }
      }

      // Direct fallback via Supabase query
      const { data: directData, error } = await supabase
        .from('service_change_requests')
        .select('*, services(name, code)')
        .order('submitted_at', { ascending: false });

      if (!error && directData) {
        setChangeRequests(directData as ChangeRequestItem[]);
      }
    } catch (err) {
      console.warn('Error fetching change requests:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchChangeRequests(true);

    // Subscribe to realtime updates for service_change_requests
    const channel = supabase
      .channel('realtime_admin_change_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_change_requests' },
        () => {
          fetchChangeRequests(false);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchChangeRequests(false);
    }, 2500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchChangeRequests]);

  const handleSubmitCR = async () => {
    setSubmitError('');
    const finalDocName = docPreset === 'Other / Custom Document (Specify Manually)' ? newDocName.trim() : docPreset;
    if (!finalDocName) {
      setSubmitError('Document name is required.');
      return;
    }
    if (!reason.trim()) {
      setSubmitError('Please provide a reason / rationale for this requirement change.');
      return;
    }
    if (!targetService) {
      setSubmitError('Target service is required.');
      return;
    }

    try {
      setSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const currentDocs = targetService.requiredDocuments?.map((d) => d.name) || [];
      const proposedDocs = Array.from(new Set([...currentDocs, finalDocName]));

      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: targetService.id,
          serviceName: targetService.name,
          officeName: 'Rajkot Jan Seva Kendra',
          addedDocumentName: finalDocName,
          reason: reason.trim(),
          currentDocumentNames: currentDocs,
          proposedDocumentNames: proposedDocs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Change Request submitted successfully for ${targetService.name}!`);
        setIsModalOpen(false);
        setDocPreset(STANDARD_INDIAN_DOCUMENTS[0]);
        setNewDocName(STANDARD_INDIAN_DOCUMENTS[0]);
        setReason('');
        await fetchChangeRequests();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setSubmitError(data.error?.message || 'Failed to submit Change Request.');
      }
    } catch {
      setSubmitError('Network error occurred while submitting Change Request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
            Document Requirement Change Requests
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
            Propose document requirement modifications for state services. Requires Super Admin approval before going live.
          </p>
        </div>
        <Button variant="saffron" onClick={() => setIsModalOpen(true)} icon={<Plus size={18} />}>
          Propose New Requirement Change
        </Button>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', color: 'var(--color-success-700)', padding: '14px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: 600 }}>{successMessage}</span>
        </div>
      )}

      {/* Change Requests List */}
      {loading && changeRequests.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-neutral-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading change requests from state database...</span>
        </div>
      ) : changeRequests.length === 0 ? (
        <EmptyState
          title="No pending change requests"
          description="No document requirement change requests have been submitted yet. Propose a change to require or add documents."
          actionText="Propose New Requirement Change"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {changeRequests.map((cr) => {
            const serviceName = cr.services?.name || cr.service_name || services.find((s) => s.id === cr.service_id)?.name || 'Government Service';
            const currentDocs = cr.current_document_names && cr.current_document_names.length > 0
              ? cr.current_document_names
              : (services.find((s) => s.id === cr.service_id)?.requiredDocuments.map((d) => d.name) || []);
            const proposedDocs = cr.proposed_document_names && cr.proposed_document_names.length > 0
              ? cr.proposed_document_names
              : Array.from(new Set([...currentDocs, cr.added_document_name]));

            return (
              <Card key={cr.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary-700)', fontSize: '1.1rem' }}>
                        {cr.request_number}
                      </span>
                      <StatusBadge status={cr.status} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--color-neutral-900)', marginTop: '4px' }}>
                      Service: {serviceName}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                      Office: <strong>{cr.office_name}</strong> • Submitted: {new Date(cr.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Current vs Proposed Comparison Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* CURRENT */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-neutral-100)',
                      border: '1px solid var(--color-neutral-300)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-neutral-700)', textTransform: 'uppercase' }}>
                      Current Requirements ({currentDocs.length} Documents)
                    </span>
                    <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.9rem', color: 'var(--color-neutral-800)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {currentDocs.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  {/* PROPOSED */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--color-primary-50)',
                      border: '2px solid var(--color-primary-600)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-700)', textTransform: 'uppercase' }}>
                      Proposed Requirements ({proposedDocs.length} Documents)
                    </span>
                    <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.9rem', color: 'var(--color-neutral-900)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {proposedDocs.map((d, i) => (
                        <li
                          key={i}
                          style={{
                            fontWeight: d === cr.added_document_name ? 700 : 400,
                            color: d === cr.added_document_name ? 'var(--color-accent-700)' : 'inherit',
                          }}
                        >
                          {d} {d === cr.added_document_name ? ' (✨ PROPOSED ADDITION)' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-neutral-100)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.88rem', color: 'var(--color-neutral-800)' }}>
                  <strong>Reason for Modification:</strong> {cr.reason}
                </div>

                {cr.review_note && (
                  <div style={{ backgroundColor: cr.status === 'APPROVED' ? 'var(--color-success-50)' : 'var(--color-danger-50)', border: `1px solid ${cr.status === 'APPROVED' ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`, padding: '12px 16px', borderRadius: '10px', fontSize: '0.88rem', color: cr.status === 'APPROVED' ? 'var(--color-success-900)' : 'var(--color-danger-900)' }}>
                    <strong>Super Admin Review Note:</strong> {cr.review_note}
                    {cr.reviewed_at && <span style={{ display: 'block', fontSize: '0.78rem', marginTop: '4px', opacity: 0.8 }}>Reviewed on: {new Date(cr.reviewed_at).toLocaleString()}</span>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE CHANGE REQUEST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsModalOpen(false);
            setSubmitError('');
          }
        }}
        title="Create Requirement Change Request"
        description="Submit proposed document additions to Super Admin for approval."
        maxWidth="600px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {submitError && (
            <div style={{ backgroundColor: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', color: 'var(--color-danger-700)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{submitError}</span>
            </div>
          )}

          <Select
            label="Target Government Service"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            options={services.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          />

          <div style={{ backgroundColor: 'var(--color-neutral-100)', padding: '12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700)' }}>
              Current Required Documents ({targetService?.requiredDocuments?.length || 0}):
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-neutral-800)', marginTop: '4px' }}>
              {targetService?.requiredDocuments?.map((d) => d.name).join(', ') || 'None specified'}
            </div>
          </div>

          <Select
            label="Proposed Additional Document Name"
            value={docPreset}
            onChange={(e) => {
              setDocPreset(e.target.value);
              if (e.target.value !== 'Other / Custom Document (Specify Manually)') {
                setNewDocName(e.target.value);
              } else {
                setNewDocName('');
              }
            }}
            options={STANDARD_INDIAN_DOCUMENTS.map((doc) => ({ value: doc, label: doc }))}
          />

          {docPreset === 'Other / Custom Document (Specify Manually)' && (
            <Input
              label="Custom Document Name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="Type custom document name..."
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-neutral-800)' }}>
              Administrative Rationale / Reason for Change
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this document is required to prevent fraud or update policy compliance..."
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-neutral-300)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="saffron" onClick={handleSubmitCR} disabled={submitting} icon={<GitPullRequest size={18} />}>
              {submitting ? 'Submitting Request...' : 'Submit For Approval →'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
