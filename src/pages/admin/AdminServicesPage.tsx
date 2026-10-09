import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileText,
  ShieldCheck,
  Settings,
  PauseCircle,
  PlayCircle,
  Coffee,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateServiceSlots, type SlotInfo } from '../../data/indianLocations';

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
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  avg_processing_time_minutes?: number;
  enable_break_time?: boolean;
  break_start_time?: string;
  break_end_time?: string;
  stopped_booking_dates?: string[];
  is_booking_stopped?: boolean;
  slot_capacity?: number;
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

  // Slot Configuration Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [configService, setConfigService] = useState<ServiceItem | null>(null);
  const [startTime, setStartTime] = useState('09:30 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [slotDuration, setSlotDuration] = useState(30);
  const [avgProcTime, setAvgProcTime] = useState(5);
  const [enableBreak, setEnableBreak] = useState(true);
  const [breakStart, setBreakStart] = useState('01:00 PM');
  const [breakEnd, setBreakEnd] = useState('02:00 PM');
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [slotSuccessMsg, setSlotSuccessMsg] = useState('');
  const [slotErrorMsg, setSlotErrorMsg] = useState('');

  const fetchServices = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
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

  const handleOpenSlotModal = (srv: ServiceItem) => {
    setConfigService(srv);
    setStartTime(srv.start_time || '09:30 AM');
    setEndTime(srv.end_time || '05:00 PM');
    setSlotDuration(srv.slot_duration_minutes || 30);
    setAvgProcTime(srv.avg_processing_time_minutes || 5);
    setEnableBreak(srv.enable_break_time !== false);
    setBreakStart(srv.break_start_time || '01:00 PM');
    setBreakEnd(srv.break_end_time || '02:00 PM');
    setSlotSuccessMsg('');
    setSlotErrorMsg('');
    setIsSlotModalOpen(true);
  };

  const handleSubmitSlotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configService) return;
    setSlotErrorMsg('');
    setSlotSuccessMsg('');
    setSlotSubmitting(true);

    // Time validation
    const parseTimeToMinutes = (tStr: string): number => {
      const match = tStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = match[3].toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      setSlotErrorMsg('Service End Time must be strictly later than Service Start Time.');
      setSlotSubmitting(false);
      return;
    }

    if (!avgProcTime || avgProcTime <= 0 || isNaN(avgProcTime)) {
      setSlotErrorMsg('Average processing time per citizen must be a numeric value greater than zero minutes.');
      setSlotSubmitting(false);
      return;
    }

    // Validation: online capacity check
    const citizensPerSlot = Math.floor(slotDuration / avgProcTime);
    const onlineCapacity = Math.floor(citizensPerSlot / 2);

    if (onlineCapacity <= 0) {
      setSlotErrorMsg('Average processing time is too long for the slot duration. Online capacity cannot be 0.');
      setSlotSubmitting(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/services/${configService.id}/slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime,
          endTime,
          slotDurationMinutes: slotDuration,
          avgProcessingTimeMinutes: avgProcTime,
          enableBreakTime: enableBreak,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
          slotCapacity: onlineCapacity,
        }),
      });

      if (res.ok) {
        setSlotSuccessMsg('Slot configuration updated successfully!');
        // Update local state
        setServices((prev) =>
          prev.map((s) =>
            s.id === configService.id
              ? {
                  ...s,
                  start_time: startTime,
                  end_time: endTime,
                  slot_duration_minutes: slotDuration,
                  avg_processing_time_minutes: avgProcTime,
                  enable_break_time: enableBreak,
                  break_start_time: breakStart,
                  break_end_time: breakEnd,
                  slot_capacity: onlineCapacity,
                }
              : s
          )
        );
        setTimeout(() => setIsSlotModalOpen(false), 1200);
      } else {
        const json = await res.json().catch(() => null);
        setSlotErrorMsg(json?.error?.message || 'Failed to update slot configuration.');
      }
    } catch (err: any) {
      setSlotErrorMsg(err.message || 'Server connection error.');
    } finally {
      setSlotSubmitting(false);
    }
  };

  const handleToggleStopBookingToday = async (srv: ServiceItem) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentStopped = srv.stopped_booking_dates || [];
    const isAlreadyStopped = currentStopped.includes(todayStr) || srv.is_booking_stopped;

    let updatedStoppedDates: string[];
    if (isAlreadyStopped) {
      updatedStoppedDates = currentStopped.filter((d) => d !== todayStr);
    } else {
      updatedStoppedDates = Array.from(new Set([...currentStopped, todayStr]));
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch(`/api/services/${srv.id}/slots`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stoppedBookingDates: updatedStoppedDates,
          isBookingStopped: !isAlreadyStopped,
        }),
      });

      if (res.ok) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === srv.id
              ? {
                  ...s,
                  stopped_booking_dates: updatedStoppedDates,
                  is_booking_stopped: !isAlreadyStopped,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.warn('Failed to toggle booking stop:', err);
    }
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const targetSrv = services.find((s) => s.id === selectedServiceId);
      const currentDocNames = targetSrv?.document_requirements?.map((d) => d.name) || [];
      const proposedDocNames = Array.from(new Set([...currentDocNames, addedDocName]));

      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          serviceName: targetSrv?.name || 'Service',
          officeName: 'District Administration',
          currentDocumentNames: currentDocNames,
          proposedDocumentNames: proposedDocNames,
          addedDocumentName: addedDocName,
          reason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCrSuccess(true);
        setTimeout(() => {
          setIsCRModalOpen(false);
          navigate('/admin/change-requests');
        }, 1200);
      } else {
        setCrError(json.error?.message || 'Failed to submit Change Request.');
      }
    } catch (err: any) {
      setCrError(err.message || 'Server connection error.');
    } finally {
      setCrSubmitting(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));
    return ['ALL', ...cats];
  }, [services]);

  // Filtered Services list
  const filteredServices = services.filter((srv) => {
    const matchesCategory = selectedCategory === 'ALL' || srv.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      srv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Slot Breakdown Preview for Config Modal
  const previewSlots: SlotInfo[] = useMemo(() => {
    return generateServiceSlots({
      startTime,
      endTime,
      slotDurationMinutes: slotDuration,
      enableBreakTime: enableBreak,
      breakStartTime: breakStart,
      breakEndTime: breakEnd,
    });
  }, [startTime, endTime, slotDuration, enableBreak, breakStart, breakEnd]);

  // Live Capacity Calculations for Modal
  const citizensPerSlotCalc = Math.floor(slotDuration / (avgProcTime || 5));
  const onlineCapCalc = Math.floor(citizensPerSlotCalc / 2);
  const offlineCapCalc = citizensPerSlotCalc - onlineCapCalc;

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
              <ShieldCheck size={14} /> District Administration • Service & Queue Slot Controls
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
            Services Catalog, Slot Configuration & Controls
          </h1>
          <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px', fontSize: '0.95rem' }}>
            Configure service slots, break schedules, 50% online slot allocation formulas, and emergency booking pauses.
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

      {/* Services Grid */}
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
          {filteredServices.map((srv) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isStoppedToday =
              (srv.stopped_booking_dates && srv.stopped_booking_dates.includes(todayStr)) ||
              srv.is_booking_stopped;

            const duration = srv.slot_duration_minutes || 30;
            const procTime = srv.avg_processing_time_minutes || 5;
            const citizensPerSlot = Math.floor(duration / procTime);
            const onlineCap = Math.max(1, Math.floor(citizensPerSlot / 2));

            return (
              <div
                key={srv.id}
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderRadius: '16px',
                  border: isStoppedToday ? '2px solid var(--color-warning-400)' : '1px solid var(--color-border)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: 'var(--shadow-xs)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Badge variant="neutral">{srv.code}</Badge>
                      <Badge variant="info">{srv.category}</Badge>
                      {isStoppedToday && (
                        <Badge variant="warning">
                          ⏸️ BOOKING PAUSED TODAY
                        </Badge>
                      )}
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

                  {/* SLA, Fee & Slot Config Info Bar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-bg-page)',
                      border: '1px solid var(--color-border-subtle)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-neutral-500)', display: 'block' }}>Timing / Slots</span>
                      <strong style={{ color: 'var(--color-primary-900)' }}>
                        {srv.start_time || '09:30 AM'} - {srv.end_time || '05:00 PM'} ({duration}m)
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-neutral-500)', display: 'block' }}>Capacity (50% Online)</span>
                      <strong style={{ color: 'var(--color-success-700)' }}>
                        {onlineCap} token/slot ({procTime}m/person)
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-neutral-500)', display: 'block' }}>Break Window</span>
                      <strong style={{ color: 'var(--color-warning-800)' }}>
                        {srv.enable_break_time !== false ? `${srv.break_start_time || '01:00 PM'}` : 'No Break'}
                      </strong>
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

                {/* Card Action Buttons */}
                <div
                  style={{
                    paddingTop: '14px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSlotModal(srv)}
                      icon={<Settings size={14} />}
                      style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                    >
                      Configure Slots
                    </Button>

                    <Button
                      variant={isStoppedToday ? 'outline' : 'danger'}
                      size="sm"
                      onClick={() => handleToggleStopBookingToday(srv)}
                      icon={isStoppedToday ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                      style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                    >
                      {isStoppedToday ? 'Resume Booking' : 'Stop Booking Today'}
                    </Button>
                  </div>

                  <Button
                    variant="saffron"
                    size="sm"
                    onClick={() => handleOpenCRModal(srv.id)}
                    icon={<GitPullRequest size={14} />}
                    style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                  >
                    Propose Doc Change
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. SLOT & BREAK TIME CONFIGURATION MODAL                     */}
      {/* ============================================================ */}
      {configService && (
        <Modal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          title={`Configure Service Slots & Break Time — ${configService.name}`}
          maxWidth="720px"
        >
          <form onSubmit={handleSubmitSlotConfig} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {slotSuccessMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-success-50)', color: 'var(--color-success-900)', border: '1px solid var(--color-success-300)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> {slotSuccessMsg}
              </div>
            )}
            {slotErrorMsg && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger-50)', color: 'var(--color-danger-900)', border: '1px solid var(--color-danger-300)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> {slotErrorMsg}
              </div>
            )}

            {/* Operating Hours */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '4px' }}>
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'white' }}
                >
                  {['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '4px' }}>
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'white' }}
                >
                  {['04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slot Duration & Avg Processing Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '4px' }}>
                  Slot Duration (Minutes)
                </label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'white' }}
                >
                  {[30, 35, 40, 45, 50, 55, 60].map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '4px' }}>
                  Average Processing Time per Citizen (mins)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={avgProcTime || ''}
                  onChange={(e) => setAvgProcTime(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  placeholder="e.g. 5"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--color-primary-900)',
                  }}
                />
              </div>
            </div>

            {/* Live Formula & Capacity Preview Card */}
            <div style={{ backgroundColor: 'var(--color-primary-50)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-primary-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-primary-900)', marginBottom: '6px' }}>
                <Users size={16} color="var(--color-primary-700)" />
                Slot Capacity Calculations Preview:
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-primary-900)', lineHeight: '1.6' }}>
                • Theoretical capacity per slot: <strong>{citizensPerSlotCalc} citizens</strong> (floor({slotDuration} ÷ {avgProcTime}))<br />
                • Reserved for offline citizens: <strong>{offlineCapCalc} citizens</strong><br />
                • Maximum online bookings: <strong>{onlineCapCalc} citizens</strong> (floor({citizensPerSlotCalc} ÷ 2))
              </div>
              {onlineCapCalc <= 0 && (
                <div style={{ color: 'var(--color-danger-700)', fontWeight: 800, fontSize: '0.8rem', marginTop: '6px' }}>
                  ⚠️ Warning: Calculated online capacity is zero. Please decrease processing time or increase slot duration before saving.
                </div>
              )}
            </div>

            {/* Break Time Management */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coffee size={16} /> Enable Employee Break Schedule
                </label>
                <input
                  type="checkbox"
                  checked={enableBreak}
                  onChange={(e) => setEnableBreak(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {enableBreak && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', backgroundColor: 'var(--color-bg-page)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                      Break Start Time
                    </label>
                    <select
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'white', fontSize: '0.85rem' }}
                    >
                      {['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                      Break End Time
                    </label>
                    <select
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'white', fontSize: '0.85rem' }}
                    >
                      {['01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Live Generated Slots Preview Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700)', marginBottom: '6px' }}>
                Generated Slots Preview ({previewSlots.length} Slots Total):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                {previewSlots.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      backgroundColor: s.isBreak ? 'var(--color-warning-100)' : 'var(--color-bg-page)',
                      color: s.isBreak ? 'var(--color-warning-900)' : 'var(--color-neutral-800)',
                      border: s.isBreak ? '1px solid var(--color-warning-300)' : '1px solid var(--color-border)',
                    }}
                  >
                    {s.slot} {s.isBreak ? '☕ BREAK' : ''}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button type="button" variant="outline" onClick={() => setIsSlotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="saffron" disabled={slotSubmitting || onlineCapCalc <= 0}>
                Save Slot Configuration
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 2. CHANGE REQUEST FORM MODAL                                 */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCRModalOpen}
        onClose={() => setIsCRModalOpen(false)}
        title="Propose Document Requirement Change"
        maxWidth="680px"
      >
        <form onSubmit={handleSubmitChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {crSuccess && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-success-50)', color: 'var(--color-success-900)', border: '1px solid var(--color-success-300)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> Change Request successfully submitted to Super Admin! Redirecting...
            </div>
          )}
          {crError && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger-50)', color: 'var(--color-danger-900)', border: '1px solid var(--color-danger-300)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> {crError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '6px' }}>
              Select Government Service <span style={{ color: 'red' }}>*</span>
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
              }}
              required
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) • SLA: {s.processing_time_days} Days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '6px' }}>
              Select Document from Standard Registry <span style={{ color: 'red' }}>*</span>
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
              <Input
                label="Specify Custom Document Name *"
                value={addedDocName}
                onChange={(e) => setAddedDocName(e.target.value)}
                placeholder="e.g. Gram Panchayat NOC / Income Tax Declaration"
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '6px' }}>
              Justification & Operational Reason <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this document proof is mandatory for citizen verification at local counter..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button type="button" variant="outline" onClick={() => setIsCRModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="saffron" disabled={crSubmitting}>
              Submit Proposal to Super Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
