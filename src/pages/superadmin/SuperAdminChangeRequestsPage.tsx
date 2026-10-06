import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ToastContainer } from '../../components/ui/Toast';
import type { ToastMessage } from '../../components/ui/Toast';
import { CheckCircle2, XCircle, Clock, AlertCircle, GitPullRequest, FileText, CheckCircle } from 'lucide-react';

interface DBChangeRequest {
  id: string;
  request_number: string;
  service_id: string;
  office_name: string;
  added_document_name: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  review_note?: string;
  submitted_at: string;
  reviewed_at?: string;
  services?: { name?: string; code?: string };
}

export const SuperAdminChangeRequestsPage: React.FC = () => {
  const [changeRequests, setChangeRequests] = useState<DBChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Review Modal State
  const [selectedCR, setSelectedCR] = useState<DBChangeRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChangeRequests();

    // SUPABASE REALTIME SUBSCRIPTION FOR CHANGE REQUESTS
    const channel = supabase
      .channel('realtime_change_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_change_requests' },
        (payload) => {
          console.log('[REALTIME] Change request updated:', payload);
          if (payload.eventType === 'INSERT') {
            addToast('info', 'New Change Request Received!', `Request ${payload.new.request_number || ''} submitted.`);
          }
          fetchChangeRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/change-requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const responseData = await res.json();

      if (responseData.success && Array.isArray(responseData.data)) {
        setChangeRequests(responseData.data);
      } else {
        // Direct Supabase Fallback query
        const { data: directData } = await supabase
          .from('service_change_requests')
          .select('*, services(name, code)')
          .order('submitted_at', { ascending: false });

        setChangeRequests(directData || []);
      }
    } catch (err) {
      console.warn('Error fetching change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (cr: DBChangeRequest, type: 'APPROVED' | 'REJECTED') => {
    setSelectedCR(cr);
    setActionType(type);
    setReviewNote(type === 'APPROVED' ? 'Approved per regulatory compliance.' : 'Rejected due to documentation burden.');
    setIsModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCR) return;

    try {
      setSubmitting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/change-requests/${selectedCR.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: actionType,
          reviewNote: reviewNote.trim(),
        }),
      });

      const responseData = await res.json();

      if (!res.ok || !responseData.success) {
        throw new Error(responseData.error?.message || 'Failed to update review status.');
      }

      addToast(
        actionType === 'APPROVED' ? 'success' : 'warning',
        `Change Request ${actionType === 'APPROVED' ? 'Approved & Live!' : 'Rejected'}`,
        `Request ${selectedCR.request_number} has been ${actionType.toLowerCase()}.`
      );

      setIsModalOpen(false);
      fetchChangeRequests();
    } catch (err: any) {
      addToast('error', 'Action Failed', err.message || 'Error executing review action.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="info" style={{ fontWeight: 800 }}>REAL-TIME WORKFLOW</Badge>
          <span style={{ fontSize: '12px', color: 'var(--color-success-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span> Live Supabase Updates Active
          </span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary-900)', margin: '6px 0 0 0' }}>
          Document Requirement Change Requests Review
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', margin: '4px 0 0 0', fontSize: '14px' }}>
          Review document requirement modification proposals submitted by office administrators in real-time. Approving automatically adds the document to live public service workflows.
        </p>
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-neutral-500)' }}>
          Loading real-time change requests...
        </div>
      ) : changeRequests.length === 0 ? (
        <Card padding="40px" style={{ textAlign: 'center' }}>
          <GitPullRequest size={48} style={{ color: 'var(--color-neutral-300)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-neutral-700)', margin: '0 0 6px 0' }}>
            No Change Requests Found
          </h3>
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '14px', margin: 0 }}>
            When Office Admins submit document requirement changes, they will appear here in real-time.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {changeRequests.map((cr) => (
            <Card
              key={cr.id}
              padding="20px"
              style={{
                borderLeft:
                  cr.status === 'PENDING'
                    ? '5px solid var(--color-warning-500)'
                    : cr.status === 'APPROVED'
                    ? '5px solid var(--color-success-500)'
                    : '5px solid var(--color-danger-500)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-primary-900)', fontSize: '16px', fontFamily: 'monospace' }}>
                      #{cr.request_number}
                    </span>
                    <Badge
                      variant={cr.status === 'PENDING' ? 'warning' : cr.status === 'APPROVED' ? 'success' : 'danger'}
                    >
                      {cr.status}
                    </Badge>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-primary-900)', margin: '6px 0 2px 0' }}>
                    Proposed Document: <span style={{ color: 'var(--color-primary-700)' }}>{cr.added_document_name}</span>
                  </h3>

                  <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)', display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span>Office: <strong>{cr.office_name || 'District Office'}</strong></span>
                    <span>Submitted: {new Date(cr.submitted_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                {cr.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenReviewModal(cr, 'REJECTED')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={16} /> Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReviewModal(cr, 'APPROVED')}
                      style={{ backgroundColor: 'var(--color-success-700)', borderColor: 'var(--color-success-700)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={16} /> Approve & Publish
                    </Button>
                  </div>
                )}
              </div>

              {/* Rationale / Reason */}
              <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '12px', borderRadius: '8px', marginTop: '14px', border: '1px solid var(--color-neutral-200)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-neutral-700)', display: 'block', marginBottom: '2px' }}>
                  Administrative Reason / Rationale:
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-neutral-800)', lineHeight: '1.4' }}>
                  "{cr.reason}"
                </p>
              </div>

              {/* Review Notes if processed */}
              {cr.review_note && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-neutral-600)' }}>
                  <strong>Review Decision Note:</strong> {cr.review_note}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* REVIEW DECISION MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!submitting) setIsModalOpen(false);
        }}
        title={`Confirm Decision: ${actionType === 'APPROVED' ? 'Approve Change Request' : 'Reject Change Request'}`}
      >
        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--color-neutral-50)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-neutral-200)' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
              Request: <strong>#{selectedCR?.request_number}</strong> ({selectedCR?.office_name})
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-900)' }}>
              Document: {selectedCR?.added_document_name}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
              Reviewer Decision Note / Comments:
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--color-neutral-300)',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-neutral-200)' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionType === 'APPROVED' ? 'primary' : 'danger'}
              disabled={submitting}
              style={{
                backgroundColor: actionType === 'APPROVED' ? 'var(--color-success-700)' : undefined,
                borderColor: actionType === 'APPROVED' ? 'var(--color-success-700)' : undefined,
              }}
            >
              {submitting ? 'Processing...' : actionType === 'APPROVED' ? 'Approve & Go Live' : 'Reject Change Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* TOP RIGHT TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
