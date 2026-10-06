import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AIAssistantWidget } from '../../components/assistant/AIAssistantWidget';
import {
  Building,
  CheckSquare,
  Bot,
  ShieldCheck,
  MapPin,
  Ticket,
} from 'lucide-react';

export const ServiceDetailPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { getServiceById, offices, issueQueueToken, submitApplication } = useData();
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const service = getServiceById(serviceId || 'srv-001');

  if (!service) {
    return (
      <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'center' }}>
        <h2>Service Not Found</h2>
        <Button variant="primary" onClick={() => navigate('/services')} style={{ marginTop: '16px' }}>
          Back to Service Catalog
        </Button>
      </div>
    );
  }

  const handleCreateApplicationAndToken = () => {
    if (!currentUser) {
      navigate(`/login?redirect=/services/${service.id}`);
      return;
    }

    const citizenId = currentUser.id;
    const citizenName = currentUser.name;
    const citizenPhone = currentUser.phone || '';

    const mockDocSubmissions = service.requiredDocuments.map((d) => ({
      requirementId: d.id,
      requirementName: d.name,
      fileName: `${d.name.toLowerCase().replace(/\s+/g, '_')}_document.pdf`,
    }));

    submitApplication(service.id, service.name, citizenId, citizenName, citizenPhone, mockDocSubmissions);
    issueQueueToken(citizenId, citizenName, citizenPhone, service.id, service.name);

    setIsApplyModalOpen(false);
    navigate('/user/queue');
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header Card */}
      <Card style={{ backgroundColor: 'var(--color-primary-900)', color: 'white', padding: isSimple ? '36px' : '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="blue">{service.category}</Badge>
              <span style={{ fontSize: '0.85rem', color: '#93C5FD', fontWeight: 600 }}>
                CODE: {service.code}
              </span>
            </div>
            <h1 style={{ fontSize: isSimple ? '2.5rem' : '2rem', color: 'white', margin: 0 }}>
              {service.name}
            </h1>
            <p style={{ fontSize: isSimple ? '1.15rem' : '1rem', color: 'var(--color-neutral-300)', lineHeight: '1.6' }}>
              {service.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '220px' }}>
            <Button
              variant="saffron"
              size={isSimple ? 'lg' : 'md'}
              fullWidth
              onClick={() => {
                if (!currentUser) {
                  navigate(`/login?redirect=/services/${service.id}`);
                } else {
                  setIsApplyModalOpen(true);
                }
              }}
              icon={<Ticket size={20} />}
            >
              Apply & Get Token
            </Button>
            <Button
              variant="outline"
              size={isSimple ? 'lg' : 'md'}
              fullWidth
              onClick={() => {
                if (!currentUser) {
                  navigate(`/login?redirect=/services/${service.id}`);
                } else {
                  setIsAIModalOpen(true);
                }
              }}
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
              icon={<Bot size={20} />}
            >
              Ask AI Assistant
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Left Column: Requirements & Eligibility */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Dynamic Required Documents Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <CheckSquare size={24} style={{ color: 'var(--color-primary-700)' }} />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary-900)', margin: 0 }}>
                Required Documents ({service.requiredDocuments.length})
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-neutral-600)', marginBottom: '16px' }}>
              Ensure you have clear scanned PDF/JPG copies of these documents before visiting the counter:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {service.requiredDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-neutral-50)',
                    border: '1px solid var(--color-neutral-200)',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-primary-700)',
                      backgroundColor: 'var(--color-primary-100)',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: isSimple ? '1.1rem' : '0.98rem', color: 'var(--color-neutral-900)' }}>
                      {doc.name} {doc.isRequired ? <span style={{ color: 'var(--color-error-500)' }}>*</span> : null}
                    </div>
                    {doc.description && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', marginTop: '2px' }}>
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Eligibility Criteria */}
          {service.eligibilityCriteria && (
            <Card>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', marginBottom: '12px' }}>
                Who Can Apply (Eligibility)
              </h3>
              <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-neutral-700)', fontSize: isSimple ? '1.05rem' : '0.95rem' }}>
                {service.eligibilityCriteria.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Right Column: Processing Details & Available Offices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Key Facts Card */}
          <Card>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', marginBottom: '16px' }}>
              Service Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--color-neutral-600)' }}>Department</span>
                <span style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>{service.departmentName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--color-neutral-600)' }}>Estimated Processing Time</span>
                <span style={{ fontWeight: 700, color: 'var(--color-accent-700)' }}>{service.processingTimeDays} Working Days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-neutral-600)' }}>Government Fee</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success-700)' }}>
                  {service.feeAmount === 0 ? 'FREE (₹0)' : `₹${service.feeAmount}`}
                </span>
              </div>
            </div>
          </Card>

          {/* Available Offices */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Building size={22} style={{ color: 'var(--color-primary-700)' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0 }}>
                Available Offices & Counters
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {offices.map((off) => (
                <div
                  key={off.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-neutral-200)',
                    backgroundColor: 'var(--color-neutral-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                    {off.name}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {off.address}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-700)', fontWeight: 600, marginTop: '2px' }}>
                    {off.totalCounters} Active Verification Counters
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`Apply for ${service.name}`}
        description="Confirm application submission and generate your virtual token."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-primary-100)' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-primary-900)', fontSize: '1.1rem' }}>
              Citizen: {currentUser?.name || 'Logged in user'}
            </div>
            <span style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
              Phone: {currentUser?.phone || 'N/A'} • Email: {currentUser?.email || ''}
            </span>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', color: 'var(--color-neutral-900)', marginBottom: '8px' }}>
              Submitting Documents Required ({service.requiredDocuments.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {service.requiredDocuments.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--color-neutral-700)' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-success-700)' }} /> {doc.name} (Attached)
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="saffron" onClick={handleCreateApplicationAndToken} icon={<Ticket size={18} />}>
              Generate Virtual Token Now →
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Assistant Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title={`AI Service Assistant — ${service.name}`}
        maxWidth="720px"
      >
        <AIAssistantWidget initialContextService={service.name} />
      </Modal>
    </div>
  );
};
