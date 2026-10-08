import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Calendar, Clock, MapPin, CheckCircle2, Plus } from 'lucide-react';

export const UserAppointmentsPage: React.FC = () => {
  const [service, setService] = useState<string>('srv-001');
  const [office, setOffice] = useState<string>('off-001');
  const [date, setDate] = useState<string>('2026-10-10');
  const [timeSlot, setTimeSlot] = useState<string>('10:30 AM');
  const [isBooked, setIsBooked] = useState<boolean>(false);

  const [appointments, setAppointments] = useState([
    {
      id: 'APT-9041',
      serviceName: 'Income Certificate Verification',
      officeName: 'Rajkot Mamlatdar Office (City)',
      date: '10 Oct 2026',
      timeSlot: '10:30 AM',
      counterNumber: 'C-04',
      status: 'CONFIRMED',
    },
  ]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt = {
      id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceName: service === 'srv-001' ? 'Income Certificate Verification' : 'Caste Certificate Verification',
      officeName: 'Rajkot Mamlatdar Office (City)',
      date: date || '12 Oct 2026',
      timeSlot: timeSlot || '11:00 AM',
      counterNumber: 'C-02',
      status: 'CONFIRMED',
    };

    setAppointments([newApt, ...appointments]);
    setIsBooked(true);
    setTimeout(() => setIsBooked(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)' }}>
          Office Appointments
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Schedule a priority counter appointment at your local Mamlatdar or Collectorate office.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Booking Form */}
        <Card style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
              <Calendar size={20} />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>Book Priority Appointment</h3>
          </div>

          {isBooked && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} /> Priority appointment scheduled successfully!
            </div>
          )}

          <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                Select Service
              </label>
              <Select
                value={service}
                onChange={(e) => setService(e.target.value)}
                options={[
                  { value: 'srv-001', label: 'Income Certificate' },
                  { value: 'srv-002', label: 'Caste Certificate' },
                  { value: 'srv-003', label: 'Residence Certificate' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                Select Government Office
              </label>
              <Select
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                options={[
                  { value: 'off-001', label: 'Rajkot Mamlatdar Office (City)' },
                  { value: 'off-002', label: 'Rajkot District Collectorate' },
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                  Date
                </label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                  Time Slot
                </label>
                <Select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  options={[
                    { value: '09:30 AM', label: '09:30 AM' },
                    { value: '10:30 AM', label: '10:30 AM' },
                    { value: '11:30 AM', label: '11:30 AM' },
                    { value: '02:30 PM', label: '02:30 PM' },
                  ]}
                />
              </div>
            </div>

            <Button type="submit" variant="primary" icon={<Plus size={16} />}>
              Confirm Appointment
            </Button>
          </form>
        </Card>

        {/* Scheduled Appointments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>Your Appointments</h3>
          {appointments.map((apt) => (
            <Card key={apt.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-900)', fontSize: '1rem' }}>
                  {apt.id}
                </span>
                <span style={{ fontSize: '0.78rem', backgroundColor: 'var(--color-success-100)', color: 'var(--color-success-700)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                  ✓ {apt.status}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary-900)' }}>
                {apt.serviceName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary-700)' }} /> {apt.officeName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} style={{ color: 'var(--color-primary-700)' }} /> {apt.date} at {apt.timeSlot} ({apt.counterNumber})
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
