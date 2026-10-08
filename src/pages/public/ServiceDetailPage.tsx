import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  INDIAN_STATES,
  STATE_CITIES,
  FIXED_30_MIN_SLOTS,
  SERVICE_DOCUMENT_VALIDITY,
  DEFAULT_COUNTER_SEQUENCES,
  getAvailableBookingDates,
  isSlotInPastForToday,
} from '../../data/indianLocations';

export const ServiceDetailPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { getServiceById, offices, queueTokens, issueQueueToken, submitApplication } = useData();
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Jurisdiction & Slot Booking Form State
  const [selectedState, setSelectedState] = useState<string>('Gujarat');
  const [selectedCity, setSelectedCity] = useState<string>('Rajkot');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM - 10:30 AM');
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Booking Date Restrictions: Strictly Today & Tomorrow only
  const bookingDateOptions = useMemo(() => getAvailableBookingDates(), []);

  // Compute available slots: For Today, strictly exclude past time slots. Tomorrow shows all slots.
  const availableSlotsForDate = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = selectedSlotDate === todayStr;
    if (isToday) {
      return FIXED_30_MIN_SLOTS.filter((s) => !isSlotInPastForToday(s));
    }
    return FIXED_30_MIN_SLOTS;
  }, [selectedSlotDate]);

  // Keep selectedTimeSlot valid when date switches
  useEffect(() => {
    if (availableSlotsForDate.length > 0 && !availableSlotsForDate.includes(selectedTimeSlot)) {
      setSelectedTimeSlot(availableSlotsForDate[0]);
    }
  }, [availableSlotsForDate, selectedTimeSlot]);

  const service = getServiceById(serviceId || 'srv-001');

  // Synchronize city when state changes
  useEffect(() => {
    const cities = STATE_CITIES[selectedState];
    if (cities && cities.length > 0 && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [selectedState, selectedCity]);

  const availableCities = useMemo(() => {
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  // Slot capacity based on service SLA length
  const slotCapacity = useMemo(() => {
    if (!service) return 6;
    if (service.slotCapacity) return service.slotCapacity;
    const days = service.processingTimeDays || 7;
    return Math.max(2, Math.floor(30 / (days > 10 ? 10 : 5)));
  }, [service]);

  // Dynamically configured required documents for this service
  const applicableDocs = useMemo(() => {
    if (!service) return [];
    const baseDocs = service.requiredDocuments || [];
    return baseDocs.map((d) => ({
      id: d.id,
      name: d.name,
      validity: d.validityPeriod || (SERVICE_DOCUMENT_VALIDITY as any)[service.name] || service.documentValidity || 'Valid for 3 Years',
      isStateSpecific: false,
    }));
  }, [service]);

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

  const duplicateBookingForSelectedDate = useMemo(() => {
    if (!currentUser || !service) return null;
    const effectiveDate = selectedSlotDate || new Date().toISOString().split('T')[0];
    return queueTokens.find((q) => {
      const matchUser = q.citizenId === currentUser.id;
      const matchService = q.serviceId === service.id;
      const matchDate = q.slotDate === effectiveDate || (!q.slotDate && effectiveDate === new Date().toISOString().split('T')[0]);
      return matchUser && matchService && matchDate && q.status !== 'CANCELLED';
    });
  }, [queueTokens, currentUser?.id, service?.id, selectedSlotDate]);

  const handleCreateApplicationAndToken = async () => {
    if (!currentUser) {
      navigate(`/login?redirect=/services/${service.id}`);
      return;
    }

    setApplyError('');
    const effectiveDate = selectedSlotDate || new Date().toISOString().split('T')[0];
    const existing = queueTokens.find((q) => {
      const matchUser = q.citizenId === currentUser.id;
      const matchService = q.serviceId === service.id;
      const matchDate = q.slotDate === effectiveDate || (!q.slotDate && effectiveDate === new Date().toISOString().split('T')[0]);
      return matchUser && matchService && matchDate && q.status !== 'CANCELLED';
    });

    if (existing) {
      setApplyError(
        `You already have a booking (Token ${existing.tokenNumber} for ${existing.timeSlot || 'Scheduled Slot'}) for ${service.name} on ${effectiveDate}. The same user cannot book the same service multiple times on the same day.`
      );
      return;
    }

    setApplySubmitting(true);
    try {
      const citizenId = currentUser.id;
      const citizenName = currentUser.name;
      const citizenPhone = currentUser.phone || '+91 9876543210';

      const mockDocSubmissions = applicableDocs.map((d) => ({
        requirementId: d.id,
        requirementName: d.name,
        fileName: `${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_document.pdf`,
        validityPeriod: d.validity,
      }));

      const targetCounterPath =
        service.counterPath && service.counterPath.length > 0
          ? service.counterPath
          : (DEFAULT_COUNTER_SEQUENCES as any)[service.category] ||
            DEFAULT_COUNTER_SEQUENCES.Default;

      submitApplication(service.id, service.name, citizenId, citizenName, citizenPhone, mockDocSubmissions);
      await issueQueueToken(citizenId, citizenName, citizenPhone, service.id, service.name, {
        timeSlot: selectedTimeSlot,
        slotDate: selectedSlotDate,
        selectedState,
        selectedCity,
        counterPath: targetCounterPath,
        documents: mockDocSubmissions,
      });

      setIsApplyModalOpen(false);
      navigate('/user/queue');
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to issue booking token. Please try again.');
    } finally {
      setApplySubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header Card */}
      <Card style={{ backgroundColor: 'var(--color-primary-900)', color: 'white', padding: isSimple ? '36px' : '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Badge variant="blue">{service.category}</Badge>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-border)', fontWeight: 600 }}>
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
        onClose={() => {
          if (!applySubmitting) setIsApplyModalOpen(false);
        }}
        title={`Apply & Book Slot — ${service.name}`}
        description="Select your jurisdiction and advance 30-minute time slot for your virtual token."
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {applyError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-50)',
                border: '1.5px solid var(--color-danger-300)',
                color: 'var(--color-danger-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} color="var(--color-danger-600)" style={{ flexShrink: 0 }} />
              <span>{applyError}</span>
            </div>
          )}

          {duplicateBookingForSelectedDate && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-50)',
                border: '1.5px solid var(--color-danger-300)',
                color: 'var(--color-danger-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={20} color="var(--color-danger-600)" style={{ flexShrink: 0 }} />
              <div>
                <strong>Same-Day Booking Restriction:</strong> You already have Token{' '}
                <span style={{ textDecoration: 'underline' }}>{duplicateBookingForSelectedDate.tokenNumber}</span> for this service on{' '}
                {selectedSlotDate || 'today'} ({duplicateBookingForSelectedDate.timeSlot || 'Scheduled'}). The same citizen cannot book the same service multiple times on the same day.
              </div>
            </div>
          )}

          {/* State and City Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--color-primary-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--color-primary-200)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '4px' }}>
                State <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'white',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '4px' }}>
                City / District <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'white',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {availableCities.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Required Documents with Validity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900)', margin: 0, fontWeight: 700 }}>
                Required Documents for {selectedState} ({applicableDocs.length})
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>Online Proofs Uploaded</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {applicableDocs.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--color-bg-page)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--color-success-700)' }} />
                    <span style={{ fontWeight: 600 }}>{doc.name}</span>
                  </div>
                  <Badge variant={doc.isStateSpecific ? 'warning' : 'info'}>
                    {doc.validity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Minute Time Slot Picker (Strictly Today & Tomorrow Only) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                Select Booking Date & 30-Minute Time Slot
              </label>
              <span style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
                Capacity: <strong>{slotCapacity}/slot</strong>
              </span>
            </div>

            {/* STRICT DATE SELECTION: TODAY & TOMORROW ONLY */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              {bookingDateOptions.map((opt) => {
                const isSelectedDate = selectedSlotDate === opt.date;
                return (
                  <button
                    type="button"
                    key={opt.date}
                    onClick={() => setSelectedSlotDate(opt.date)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${
                        isSelectedDate ? 'var(--color-primary-800)' : 'var(--color-neutral-300)'
                      }`,
                      backgroundColor: isSelectedDate ? 'var(--color-primary-800)' : 'white',
                      color: isSelectedDate ? 'white' : 'var(--color-neutral-800)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelectedDate ? '0 2px 8px rgba(11, 79, 108, 0.2)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      {opt.label === 'Today' ? '📅 Today' : '🗓️ Tomorrow'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isSelectedDate ? 'var(--color-primary-100)' : 'var(--color-neutral-500)',
                      }}
                    >
                      {opt.formatted}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SLOTS GRID */}
            {availableSlotsForDate.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-300)',
                  borderRadius: '8px',
                  color: 'var(--color-warning-900)',
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
              >
                ⏰ <strong>No more slots available for Today.</strong> Please select <strong>Tomorrow</strong> above to book your turn.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                {availableSlotsForDate.map((slot) => {
                  const bookedCount = queueTokens.filter(
                    (q) =>
                      q.timeSlot === slot &&
                      q.slotDate === selectedSlotDate &&
                      q.serviceId === service.id &&
                      q.status !== 'CANCELLED' &&
                      q.status !== 'EXPIRED'
                  ).length;
                  const remaining = Math.max(0, slotCapacity - bookedCount);
                  const isFull = remaining === 0;
                  const isSelected = selectedTimeSlot === slot;

                  return (
                    <button
                      type="button"
                      key={slot}
                      disabled={isFull}
                      onClick={() => setSelectedTimeSlot(slot)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${
                          isSelected
                            ? 'var(--color-saffron-600)'
                            : isFull
                            ? 'var(--color-neutral-200)'
                            : 'var(--color-primary-300)'
                        }`,
                        backgroundColor: isSelected
                          ? 'var(--color-saffron-100)'
                          : isFull
                          ? 'var(--color-neutral-100)'
                          : 'white',
                        color: isFull ? 'var(--color-neutral-400)' : 'var(--color-neutral-900)',
                        cursor: isFull ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{slot}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: isFull
                            ? 'var(--color-danger-600)'
                            : isSelected
                            ? 'var(--color-saffron-800)'
                            : 'var(--color-success-700)',
                        }}
                      >
                        {isFull ? 'FULL' : `${remaining}/${slotCapacity} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsApplyModalOpen(false)} disabled={applySubmitting}>
              Cancel
            </Button>
            <Button
              variant="saffron"
              onClick={handleCreateApplicationAndToken}
              disabled={applySubmitting || !!duplicateBookingForSelectedDate}
              icon={<Ticket size={18} />}
            >
              {applySubmitting
                ? 'Booking Slot...'
                : duplicateBookingForSelectedDate
                ? 'Already Booked For This Date'
                : `Confirm & Book Slot (${selectedTimeSlot})`}
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
