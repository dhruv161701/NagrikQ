import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SkeletonCard } from '../../components/ui/skeleton';
import { supabase } from '../../config/supabase';
import {
  MapPin,
  XCircle,
  Navigation,
  CheckCircle2,
  Clock,
  Users,
  BellRing,
  Volume2,
  VolumeX,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  INDIAN_STATES,
  STATE_CITIES,
  FIXED_30_MIN_SLOTS,
  SERVICE_DOCUMENT_VALIDITY,
  DEFAULT_COUNTER_SEQUENCES,
  STATE_SPECIFIC_REQUIREMENTS,
  getAvailableBookingDates,
  isSlotInPastForToday,
} from '../../data/indianLocations';
import type { QueueToken } from '../../types';

// Web Audio API Synthesized Counter Chime
const playCounterBell = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone chime: D5 (587Hz) sliding to A5 (880Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
};

// Helper: Check if a token has exceeded its 15-minute grace period
export const checkIsTokenExpired = (token?: QueueToken | null): boolean => {
  if (!token) return false;
  if (token.status === 'EXPIRED') return true;
  if (token.status !== 'WAITING') return false;
  if (!token.timeSlot) return false;

  const parts = token.timeSlot.split('-');
  if (parts.length < 2) return false;
  const endPart = parts[1].trim(); // e.g. "02:00 PM"

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    if (token.slotDate && token.slotDate < todayStr) return true;
    if (token.slotDate && token.slotDate > todayStr) return false;

    const [time, period] = endPart.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const slotEndTime = new Date();
    slotEndTime.setHours(hours, minutes + (token.gracePeriodMinutes || 15), 0, 0);

    const now = new Date();
    return now.getTime() > slotEndTime.getTime();
  } catch {
    return false;
  }
};

export const UserQueuePage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    services,
    offices,
    queueTokens,
    isQueueTokensLoaded,
    getUserActiveToken,
    getUserQueueTokens,
    issueQueueToken,
    cancelQueueToken,
    rebookExpiredTokenSlot,
    refreshQueueTokens,
  } = useData();
  const { uiMode } = useUI();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  const userId = currentUser?.id || '';
  const rawActiveToken = getUserActiveToken(userId);
  const myAllTokens = getUserQueueTokens(userId);
  const pastTokens = myAllTokens.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'EXPIRED'
  );

  // Dynamic token expiry state check
  const isGracePeriodExpired = checkIsTokenExpired(rawActiveToken);
  const activeToken: QueueToken | undefined = rawActiveToken
    ? isGracePeriodExpired
      ? { ...rawActiveToken, status: 'EXPIRED' as const, isLate: true }
      : rawActiveToken
    : undefined;

  // States
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Booking Form State — State & City Selection
  const [selectedState, setSelectedState] = useState<string>('Gujarat');
  const [selectedCity, setSelectedCity] = useState<string>('Rajkot');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM - 10:30 AM');
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [citizenName, setCitizenName] = useState(currentUser?.name || 'Citizen User');
  const [citizenPhone, setCitizenPhone] = useState(currentUser?.phone || '+91 9876543210');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

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

  // Keep selectedTimeSlot valid when date switches or on mount
  useEffect(() => {
    if (availableSlotsForDate.length > 0 && !availableSlotsForDate.includes(selectedTimeSlot)) {
      setSelectedTimeSlot(availableSlotsForDate[0]);
    }
  }, [availableSlotsForDate, selectedTimeSlot]);

  // Rebooking Expired Token State
  const [isRebookModalOpen, setIsRebookModalOpen] = useState(false);
  const [rebookTimeSlot, setRebookTimeSlot] = useState<string>('');
  const [rebookingSubmitting, setRebookingSubmitting] = useState(false);
  const [rebookError, setRebookError] = useState('');

  // Track status transitions to fire audio chime
  const prevStatusRef = useRef<string | undefined>(activeToken?.status);

  // Set default selection when services/offices load
  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
    if (!selectedOfficeId && offices.length > 0) {
      setSelectedOfficeId(offices[0].id);
    }
  }, [services, offices, selectedServiceId, selectedOfficeId]);

  // Audio chime when token is CALLED or IN_SERVICE
  useEffect(() => {
    if (activeToken) {
      if (
        prevStatusRef.current === 'WAITING' &&
        (activeToken.status === 'CALLED' || activeToken.status === 'IN_SERVICE')
      ) {
        if (soundEnabled) {
          playCounterBell();
        }
      }
      prevStatusRef.current = activeToken.status;
    } else {
      prevStatusRef.current = undefined;
    }
  }, [activeToken, soundEnabled]);

  // Real-time Supabase subscription on queue_tokens & background polling
  useEffect(() => {
    const channel = supabase
      .channel('realtime_citizen_queue_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_tokens' },
        () => {
          refreshQueueTokens();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      refreshQueueTokens();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refreshQueueTokens]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshQueueTokens();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleConfirmCancelToken = async () => {
    if (!activeToken) return;
    setCancelling(true);
    try {
      await cancelQueueToken(activeToken.id);
      setCancelModalOpen(false);
      await refreshQueueTokens();
    } finally {
      setCancelling(false);
    }
  };

  // Available cities based on selected state
  const availableCities = useMemo(() => {
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  // Synchronize city when state changes
  useEffect(() => {
    const cities = STATE_CITIES[selectedState];
    if (cities && cities.length > 0 && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [selectedState, selectedCity]);

  // Services available for the selected state and city
  const availableServices = useMemo(() => {
    return services.filter((s) => {
      if (!s.isActive) return false;
      const matchState =
        !s.applicableStates ||
        s.applicableStates.length === 0 ||
        s.applicableStates.includes(selectedState);
      const matchCity =
        !s.applicableCities ||
        s.applicableCities.length === 0 ||
        s.applicableCities.includes(selectedCity);
      return matchState || matchCity;
    });
  }, [services, selectedState, selectedCity]);

  // Auto-set service if current selection is not available
  useEffect(() => {
    if (availableServices.length > 0) {
      const exists = availableServices.some((s) => s.id === selectedServiceId);
      if (!exists) {
        setSelectedServiceId(availableServices[0].id);
      }
    }
  }, [availableServices, selectedServiceId]);

  // Target service for modal preview & slots
  const targetService = useMemo(() => {
    return (
      availableServices.find((s) => s.id === selectedServiceId) ||
      availableServices[0] ||
      services[0]
    );
  }, [availableServices, selectedServiceId, services]);

  // Slot capacity based on service processing length
  const slotCapacity = useMemo(() => {
    if (!targetService) return 6;
    if (targetService.slotCapacity) return targetService.slotCapacity;
    const days = targetService.processingTimeDays || 7;
    return Math.max(2, Math.floor(30 / (days > 10 ? 10 : 5)));
  }, [targetService]);

  // Jurisdiction-specific required documents with validity period
  const jurisdictionDocs = useMemo(() => {
    if (!targetService) return [];
    const baseDocs = targetService.requiredDocuments || [];
    const extraDocs = STATE_SPECIFIC_REQUIREMENTS[selectedState] || [];
    return [
      ...baseDocs.map((d) => ({
        id: d.id,
        name: d.name,
        validity:
          d.validityPeriod ||
          (SERVICE_DOCUMENT_VALIDITY as any)[targetService.name] ||
          'Valid for 3 Years',
        isStateSpecific: false,
      })),
      ...extraDocs.map((e, idx) => ({
        id: `extra-${idx}`,
        name: `${e.docName} (${selectedState} State Mandate)`,
        validity: 'Valid for 1 Year (State Rule)',
        isStateSpecific: true,
      })),
    ];
  }, [targetService, selectedState]);

  // Estimated wait time calculated separately for that selected State and City
  const selectedJurisdictionWaiters = useMemo(() => {
    return queueTokens.filter(
      (q) =>
        q.serviceId === targetService?.id &&
        q.status === 'WAITING' &&
        (!q.selectedState || q.selectedState === selectedState)
    ).length;
  }, [queueTokens, targetService, selectedState]);

  // Rebooking slots list (only future slots for today with remaining capacity)
  const availableRebookSlots = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return FIXED_30_MIN_SLOTS.map((slot) => {
      const [startPart] = slot.split('-');
      const [time, period] = startPart.trim().split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      const slotStartMinutes = hours * 60 + minutes;

      const isFuture = slotStartMinutes > currentMinutes;

      const bookedCount = queueTokens.filter(
        (q) =>
          q.timeSlot === slot &&
          q.slotDate === new Date().toISOString().split('T')[0] &&
          q.status !== 'CANCELLED' &&
          q.status !== 'EXPIRED'
      ).length;

      const remainingSpots = Math.max(0, slotCapacity - bookedCount);
      return {
        slot,
        isFuture,
        remainingSpots,
        isAvailable: isFuture && remainingSpots > 0,
      };
    }).filter((s) => s.isFuture);
  }, [queueTokens, slotCapacity]);

  const handleBookToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    if (!targetService) {
      setBookingError('Please select a valid government service.');
      return;
    }

    setBookingSubmitting(true);
    try {
      const targetCounterPath =
        targetService.counterPath && targetService.counterPath.length > 0
          ? targetService.counterPath
          : (DEFAULT_COUNTER_SEQUENCES as any)[targetService.category] ||
            DEFAULT_COUNTER_SEQUENCES.Default;

      const docsToSubmit = jurisdictionDocs.map((d) => ({
        requirementId: d.id,
        requirementName: d.name,
        fileName: `${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_document.pdf`,
        validityPeriod: d.validity,
      }));

      await issueQueueToken(
        userId || 'guest-citizen',
        citizenName.trim() || 'Citizen User',
        citizenPhone.trim() || '+91 9876543210',
        targetService.id,
        targetService.name,
        {
          officeId: selectedOfficeId || offices[0]?.id,
          timeSlot: selectedTimeSlot,
          slotDate: selectedSlotDate,
          selectedState,
          selectedCity,
          counterPath: targetCounterPath,
          documents: docsToSubmit,
        }
      );

      if (soundEnabled) {
        playCounterBell();
      }
      setIsBookModalOpen(false);
      await refreshQueueTokens();
    } catch {
      setBookingError('Failed to generate virtual token. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleConfirmRebook = async () => {
    if (!activeToken || !rebookTimeSlot) return;
    setRebookingSubmitting(true);
    setRebookError('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await rebookExpiredTokenSlot(activeToken.id, rebookTimeSlot, todayStr);
      setIsRebookModalOpen(false);
      await refreshQueueTokens();
    } catch {
      setRebookError('Failed to rebook token. Please choose another available slot.');
    } finally {
      setRebookingSubmitting(false);
    }
  };

  // Compute live "Now Serving" token for this service
  const currentServingToken = activeToken
    ? queueTokens.find(
        (q) =>
          (q.status === 'IN_SERVICE' || q.status === 'CALLED') &&
          q.serviceId === activeToken.serviceId &&
          q.counterNumber === activeToken.counterNumber
      )?.tokenNumber ||
      queueTokens.find(
        (q) => q.status === 'IN_SERVICE' || q.status === 'CALLED'
      )?.tokenNumber ||
      (activeToken.peopleAhead > 0
        ? `A${Math.max(101, parseInt(activeToken.tokenNumber.replace(/\D/g, '') || '101', 10) - activeToken.peopleAhead)}`
        : activeToken.tokenNumber)
    : 'A-101';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.85rem', color: 'var(--color-primary-900)', margin: 0, fontWeight: 800 }}>
              Live Virtual Queue Tracker
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'rgba(245, 130, 32, 0.12)',
                color: 'var(--color-saffron-600)',
                border: '1px solid rgba(245, 130, 32, 0.3)',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              REALTIME SYNC
            </span>
          </div>
          <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '6px', marginBottom: 0 }}>
            Official NagrikQ citizen token status linked with digital counter dispatchers.
          </p>
        </div>

        {/* Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled((prev) => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            title={soundEnabled ? 'Mute counter announcement audio' : 'Enable audio counter announcement'}
          >
            {soundEnabled ? <Volume2 size={16} style={{ color: 'var(--color-success-600)' }} /> : <VolumeX size={16} style={{ color: 'var(--color-neutral-400)' }} />}
            <span>{soundEnabled ? 'Chime On' : 'Chime Off'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </Button>

          {!activeToken && (
            <Button
              variant="saffron"
              size="sm"
              onClick={() => setIsBookModalOpen(true)}
              icon={<Plus size={16} />}
              style={{ fontWeight: 700 }}
            >
              Get Virtual Token
            </Button>
          )}
        </div>
      </div>

      {/* INITIAL SKELETON */}
      {!isQueueTokensLoaded ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonCard />
        </div>
      ) : activeToken ? (
        /* ============================================================ */
        /* ACTIVE TOKEN VIEW                                           */
        /* ============================================================ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Expired Token Alert Banner (Grace Period Passed) */}
          {activeToken.status === 'EXPIRED' ? (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '2px solid #EF4444',
                color: '#991B1B',
                padding: '20px 24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.18)',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#991B1B' }}>
                    ⚠️ Virtual Token Expired (15-Minute Grace Period Exceeded)
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#B91C1C' }}>
                    Your booked slot was <strong>{activeToken.timeSlot || 'earlier today'}</strong>. Because you did not arrive within the 15-minute grace period, your token has expired. You can rebook an available slot for today.
                  </p>
                </div>
              </div>
              <Button
                variant="saffron"
                onClick={() => {
                  setRebookTimeSlot('');
                  setIsRebookModalOpen(true);
                }}
                icon={<RotateCcw size={16} />}
                style={{ fontWeight: 800 }}
              >
                Rebook Available Slot for Today
              </Button>
            </div>
          ) : activeToken.status === 'CALLED' ? (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '2px solid #F59E0B',
                color: '#92400E',
                padding: '20px 24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
                animation: 'pulse 2s infinite',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#78350F' }}>
                    🔔 IT IS YOUR TURN NOW!
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#92400E', fontWeight: 600 }}>
                    Please proceed immediately to <strong>Counter {activeToken.counterNumber || 'C-04'}</strong>. The verification officer is calling your token.
                  </p>
                </div>
              </div>
              <Button
                variant="saffron"
                onClick={() => alert(`Proceed to Counter ${activeToken.counterNumber || 'C-04'} at ${activeToken.officeName}. Keep your identity proofs ready.`)}
                style={{ fontWeight: 800 }}
              >
                Go to Counter {activeToken.counterNumber || 'C-04'}
              </Button>
            </div>
          ) : activeToken.status === 'IN_SERVICE' ? (
            <div
              style={{
                backgroundColor: 'var(--color-success-50)',
                border: '2px solid var(--color-success-500)',
                color: 'var(--color-success-800)',
                padding: '18px 24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
              }}
            >
              <Sparkles size={28} style={{ color: 'var(--color-success-600)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Service In Progress at Counter {activeToken.counterNumber}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', color: 'var(--color-success-700)' }}>
                  Your documents are currently being inspected and recorded into the state register.
                </p>
              </div>
            </div>
          ) : null}

          {/* GIANT HERO TOKEN PASS CARD */}
          <Card
            style={{
              background: 'linear-gradient(135deg, #0F2A4A 0%, #1A365D 50%, #2A4365 100%)',
              color: 'white',
              padding: isSimple ? '36px' : '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              borderRadius: '20px',
              boxShadow: '0 12px 32px rgba(15, 42, 74, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Pass Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-saffron-400)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      backgroundColor: 'rgba(245, 130, 32, 0.18)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    STATE DIGITAL PASS • COUNTER {activeToken.counterNumber || 'C-04'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                    Ref: #{activeToken.id.slice(0, 8)}
                  </span>
                </div>

                <h2 style={{ fontSize: isSimple ? '2.2rem' : '1.75rem', color: 'white', margin: '0 0 6px 0', fontWeight: 800 }}>
                  {activeToken.serviceName}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} style={{ color: 'var(--color-saffron-400)' }} />
                    {activeToken.selectedCity ? `${activeToken.selectedCity}, ${activeToken.selectedState}` : activeToken.officeName}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} />
                    Slot: <strong>{activeToken.timeSlot || 'General Virtual Slot'}</strong> ({activeToken.slotDate || 'Today'})
                  </span>
                  <span>Citizen: <strong>{activeToken.citizenName}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <StatusBadge status={activeToken.status} />
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  Virtual Queue Entry
                </span>
              </div>
            </div>

            {/* MULTIPLE COUNTER / TABLE NAVIGATION ROUTE */}
            {activeToken.counterPath && activeToken.counterPath.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(8px)',
                  padding: '18px 20px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-saffron-400)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    🗺️ Required Counter Route ({activeToken.counterPath.length} Desks)
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                    Current Stage: <strong>Step {(activeToken.currentCounterIndex ?? 0) + 1} of {activeToken.counterPath.length}</strong>
                  </span>
                </div>

                {/* Sequence Path Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {activeToken.counterPath.map((step, sIdx) => {
                    const isCurrent = sIdx === (activeToken.currentCounterIndex ?? 0);
                    const isPassed = sIdx < (activeToken.currentCounterIndex ?? 0);
                    return (
                      <React.Fragment key={sIdx}>
                        <div
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            backgroundColor: isCurrent
                              ? 'var(--color-saffron-500)'
                              : isPassed
                              ? 'rgba(16, 185, 129, 0.25)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: isCurrent ? '#000' : 'white',
                            fontWeight: isCurrent ? 800 : 600,
                            fontSize: '0.85rem',
                            border: isCurrent
                              ? '2px solid white'
                              : isPassed
                              ? '1px solid rgba(16, 185, 129, 0.5)'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: isCurrent ? '0 4px 14px rgba(245, 158, 11, 0.4)' : 'none',
                          }}
                        >
                          <span>{isPassed ? '✓' : `${sIdx + 1}.`}</span>
                          <span>{step}</span>
                          {isCurrent && (
                            <span style={{ fontSize: '10px', backgroundColor: '#000', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {sIdx < (activeToken.counterPath?.length ?? 0) - 1 && (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, fontSize: '1rem' }}>
                            →
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.4' }}>
                  Follow this sequence in order. You are currently at <strong>{activeToken.counterPath[activeToken.currentCounterIndex ?? 0] || `Counter ${activeToken.counterNumber}`}</strong>. The desk officer will stamp and route you forward.
                </div>
              </div>
            )}

            {/* Metrics Dashboard Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                padding: '22px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Your Token</span>
                <div style={{ fontSize: isSimple ? '3.2rem' : '2.6rem', fontWeight: 900, color: 'var(--color-saffron-400)', marginTop: '4px', letterSpacing: '-1px' }}>
                  {activeToken.tokenNumber}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Assigned to you</span>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Now Serving</span>
                <div style={{ fontSize: isSimple ? '3.2rem' : '2.6rem', fontWeight: 900, color: 'white', marginTop: '4px', letterSpacing: '-1px' }}>
                  {currentServingToken}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>At Counter {activeToken.counterNumber || 'C-04'}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Citizens Ahead</span>
                <div style={{ fontSize: isSimple ? '3.2rem' : '2.6rem', fontWeight: 900, color: '#93C5FD', marginTop: '4px', letterSpacing: '-1px' }}>
                  {activeToken.peopleAhead}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>In queue ahead of you</span>
              </div>

              <div>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Estimated Wait</span>
                <div style={{ fontSize: isSimple ? '3.2rem' : '2.6rem', fontWeight: 900, color: '#86EFAC', marginTop: '4px', letterSpacing: '-1px' }}>
                  {activeToken.estimatedWaitMinutes}m
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Based on current SLA</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  variant="saffron"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeToken.officeName)}`, '_blank')}
                  icon={<Navigation size={17} />}
                  style={{ fontWeight: 700 }}
                >
                  Get Directions
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  icon={<Printer size={17} />}
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  Print Token Slip
                </Button>
              </div>

              <Button
                variant="danger"
                onClick={() => setCancelModalOpen(true)}
                icon={<XCircle size={17} />}
              >
                Cancel Token
              </Button>
            </div>
          </Card>

          {/* TIMELINE PROGRESS VISUALIZER */}
          <Card padding="28px">
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', margin: '0 0 20px 0', fontWeight: 800 }}>
              Live Token Timeline Progress
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { title: 'Token Generated', desc: `Issued at ${activeToken.issuedAt}`, done: true, active: false },
                { title: 'Waiting in Virtual Queue', desc: `${activeToken.peopleAhead} people ahead of you`, done: activeToken.status !== 'CANCELLED', active: activeToken.status === 'WAITING' },
                { title: 'Approaching Turn', desc: activeToken.peopleAhead <= 2 ? 'Please remain near counter' : 'Wait nearby', done: activeToken.peopleAhead <= 2 || activeToken.status === 'CALLED' || activeToken.status === 'IN_SERVICE', active: activeToken.peopleAhead <= 2 && activeToken.status === 'WAITING' },
                { title: 'Called to Counter', desc: `Counter ${activeToken.counterNumber || 'C-04'}`, done: activeToken.status === 'CALLED' || activeToken.status === 'IN_SERVICE', active: activeToken.status === 'CALLED' },
                { title: 'Service Completed', desc: 'Inspection finished', done: activeToken.status === 'COMPLETED', active: false },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '8px',
                    padding: '16px 12px',
                    borderRadius: '12px',
                    backgroundColor: step.active
                      ? '#FEF3C7'
                      : step.done
                      ? 'var(--color-primary-50)'
                      : 'var(--color-neutral-100)',
                    border: `1.5px solid ${
                      step.active
                        ? '#F59E0B'
                        : step.done
                        ? 'var(--color-primary-600)'
                        : 'var(--color-neutral-200)'
                    }`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: step.active
                        ? '#F59E0B'
                        : step.done
                        ? 'var(--color-primary-700)'
                        : 'var(--color-neutral-400)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {step.done ? <CheckCircle2 size={18} /> : idx + 1}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-neutral-900)' }}>
                    {step.title}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600)' }}>{step.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* ============================================================ */
        /* NO ACTIVE TOKEN (EMPTY STATE WITH QUICK ACTION)              */
        /* ============================================================ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Card
            padding="44px"
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              backgroundColor: 'var(--color-bg-card)',
              border: '2px dashed var(--color-border)',
              borderRadius: '20px',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 130, 32, 0.12)',
                color: 'var(--color-saffron-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={36} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary-900)', margin: '0 0 8px 0', fontWeight: 800 }}>
                No Active Virtual Token
              </h2>
              <p style={{ color: 'var(--color-neutral-600)', maxWidth: '540px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                You do not currently have a live queue token. You can issue a virtual token right now for any government service, check in virtually, and bypass standing in long lines.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              <Button
                variant="saffron"
                onClick={() => setIsBookModalOpen(true)}
                icon={<Plus size={18} />}
                style={{ fontWeight: 800, padding: '12px 24px' }}
              >
                Generate Virtual Token Now
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/user/services')}
                icon={<ArrowRight size={18} />}
                style={{ padding: '12px 24px' }}
              >
                Browse Service Catalog
              </Button>
            </div>
          </Card>

          {/* QUICK POPULAR SERVICES WAITING STATS */}
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', marginBottom: '16px', fontWeight: 800 }}>
              Live Counter Waiting Times Across Key Departments
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {services.slice(0, 4).map((srv) => {
                const waitingCount = queueTokens.filter(
                  (q) => q.serviceId === srv.id && q.status === 'WAITING'
                ).length;
                const estWait = Math.max(5, waitingCount * 5);

                return (
                  <Card key={srv.id} padding="20px" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <Badge variant="info">{srv.category}</Badge>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-neutral-500)', fontFamily: 'monospace' }}>
                          {srv.code}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                        {srv.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-neutral-600)', lineHeight: '1.4' }}>
                        Standard SLA: {srv.processingTimeDays} Days
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-neutral-200)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                        <Users size={15} style={{ color: 'var(--color-primary-600)' }} />
                        <span><strong>{waitingCount}</strong> in queue (~{estWait}m)</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedServiceId(srv.id);
                          setIsBookModalOpen(true);
                        }}
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        Get Token
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CITIZEN TOKEN HISTORY SECTION                                */}
      {/* ============================================================ */}
      {pastTokens.length > 0 && (
        <Card padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)', margin: 0, fontWeight: 800 }}>
                My Previous Queue Tokens ({pastTokens.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--color-neutral-500)' }}>
                Archived history of completed and cancelled counter visits.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pastTokens.map((tok) => (
              <div
                key={tok.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-800)', fontFamily: 'monospace' }}>
                    {tok.tokenNumber}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-neutral-900)' }}>
                      {tok.serviceName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                      {tok.officeName} • Counter {tok.counterNumber || 'C-01'} • {tok.issuedAt}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={tok.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* QUICK TOKEN GENERATOR MODAL                                  */}
      {/* ============================================================ */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => {
          if (!bookingSubmitting) setIsBookModalOpen(false);
        }}
        title="Book Advance Time-Slot & Virtual Token"
        maxWidth="720px"
      >
        <form onSubmit={handleBookToken} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {bookingError && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger-50)', color: 'var(--color-danger-700)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <AlertCircle size={16} />
              <span>{bookingError}</span>
            </div>
          )}

          {/* 1. STATE & CITY SELECTION (Jurisdiction-Aware) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', backgroundColor: 'var(--color-primary-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--color-primary-200)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '6px' }}>
                1. Select State <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
                required
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '6px' }}>
                2. Select City / District <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
                required
              >
                {availableCities.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. FILTERED GOVERNMENT SERVICES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                3. Select Government Service Available in {selectedCity}, {selectedState} <span style={{ color: 'red' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                {availableServices.length} Services in Jurisdiction
              </span>
            </div>
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
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category}) • SLA: {s.processingTimeDays} Days
                </option>
              ))}
            </select>
          </div>

          {/* 3. REQUIRED DOCUMENTS WITH VALIDITY PERIOD */}
          {targetService && (
            <div style={{ backgroundColor: 'var(--color-bg-page)', padding: '14px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--color-success-600)" /> Required Documents ({jurisdictionDocs.length})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-neutral-500)' }}>
                  State Document Rules Applied
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {jurisdictionDocs.map((doc, dIdx) => (
                  <div
                    key={dIdx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'white',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-success-700)', fontWeight: 800 }}>✓</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-neutral-900)' }}>{doc.name}</span>
                    </div>
                    <Badge variant={doc.isStateSpecific ? 'warning' : 'info'}>
                      {doc.validity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ADVANCE 30-MINUTE TIME-SLOT BOOKING (STRICTLY TODAY & TOMORROW ONLY) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-800)' }}>
                4. Select Booking Date & 30-Minute Time Slot <span style={{ color: 'red' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--color-neutral-600)' }}>
                Capacity: <strong>{slotCapacity} / slot</strong>
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
                ⏰ <strong>No more slots available for Today.</strong> All appointment slots for today have concluded. Please select <strong>Tomorrow</strong> above to book your turn.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {availableSlotsForDate.map((slot) => {
                  const bookedCount = queueTokens.filter(
                    (q) =>
                      q.timeSlot === slot &&
                      q.slotDate === selectedSlotDate &&
                      q.serviceId === targetService?.id &&
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
                        transition: 'all 0.15s ease',
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
                        {isFull ? 'CAPACITY FULL' : `${remaining}/${slotCapacity} spots`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. CITIZEN DETAILS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                Citizen Full Name
              </label>
              <Input
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Ramesh Patel"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>
                Mobile Number (SMS Updates)
              </label>
              <Input
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="+91 9876543210"
                required
              />
            </div>
          </div>

          {/* Real-time Wait Info Box for Selected State/City */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} style={{ color: 'var(--color-primary-700)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary-900)' }}>
                  Estimate for {selectedCity}, {selectedState}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)' }}>
                  {selectedJurisdictionWaiters} citizens waiting in line locally
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-800)' }}>
                ~{Math.max(5, selectedJurisdictionWaiters * 5)} mins
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBookModalOpen(false)}
              disabled={bookingSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="saffron"
              disabled={bookingSubmitting}
              style={{ fontWeight: 800, padding: '10px 20px' }}
            >
              {bookingSubmitting ? 'Issuing Token...' : `Confirm Slot (${selectedTimeSlot})`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* REBOOK EXPIRED TOKEN MODAL                                    */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRebookModalOpen}
        onClose={() => {
          if (!rebookingSubmitting) setIsRebookModalOpen(false);
        }}
        title="Rebook Available Slot for Today"
        maxWidth="580px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rebookError && (
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger-50)', color: 'var(--color-danger-700)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <AlertCircle size={16} />
              <span>{rebookError}</span>
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-neutral-600)', lineHeight: '1.5' }}>
            Select an open 30-minute time slot for <strong>today</strong> to resume your queue turn for <strong>{activeToken?.serviceName}</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
            {availableRebookSlots.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-500)', gridColumn: '1 / -1' }}>
                No remaining open slots available for today. Please visit tomorrow morning.
              </div>
            ) : (
              availableRebookSlots.map((item) => (
                <button
                  type="button"
                  key={item.slot}
                  disabled={!item.isAvailable}
                  onClick={() => setRebookTimeSlot(item.slot)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${
                      rebookTimeSlot === item.slot
                        ? 'var(--color-saffron-600)'
                        : !item.isAvailable
                        ? 'var(--color-neutral-200)'
                        : 'var(--color-primary-300)'
                    }`,
                    backgroundColor: rebookTimeSlot === item.slot
                      ? 'var(--color-saffron-100)'
                      : !item.isAvailable
                      ? 'var(--color-neutral-100)'
                      : 'white',
                    color: !item.isAvailable ? 'var(--color-neutral-400)' : 'var(--color-neutral-900)',
                    cursor: !item.isAvailable ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.slot}</span>
                  <span style={{ fontSize: '11px', color: item.isAvailable ? 'var(--color-success-700)' : 'var(--color-danger-600)', fontWeight: 600 }}>
                    {item.isAvailable ? `${item.remainingSpots} spots open` : 'Full'}
                  </span>
                </button>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRebookModalOpen(false)}
              disabled={rebookingSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="saffron"
              onClick={handleConfirmRebook}
              disabled={!rebookTimeSlot || rebookingSubmitting}
              style={{ fontWeight: 800 }}
            >
              {rebookingSubmitting ? 'Rebooking...' : 'Confirm New Slot'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* CONFIRM CANCEL TOKEN DIALOG                                  */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancelToken}
        title="Cancel Virtual Queue Token"
        message={`Are you sure you want to cancel token "${activeToken?.tokenNumber}"? You will give up your current position (${activeToken?.peopleAhead ?? 0} ahead) in the virtual queue.`}
        confirmText={cancelling ? 'Cancelling...' : 'Yes, Cancel Token'}
        variant="danger"
      />
    </div>
  );
};
