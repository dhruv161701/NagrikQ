import React from 'react';
import type { QueueToken } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { MapPin, XCircle, ArrowRight } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useNavigate } from 'react-router-dom';

export interface QueueTrackerCardProps {
  token: QueueToken;
  onCancel?: (tokenId: string) => void;
}

export const QueueTrackerCard: React.FC<QueueTrackerCardProps> = ({ token, onCancel }) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';
  const navigate = useNavigate();

  const progressPercent = Math.max(10, Math.min(100, Math.round(((10 - token.peopleAhead) / 10) * 100)));

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        border: '2px solid var(--color-primary-600)',
        borderRadius: isSimple ? '16px' : '20px',
        padding: isSimple ? '28px' : '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
      }}
    >
      {/* Realtime Live Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ position: 'relative', display: 'flex', height: '10px', width: '10px' }}>
            <span style={{ position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: 'var(--color-success-500)', opacity: 0.75 }} />
            <span style={{ position: 'relative', height: '10px', width: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success-500)' }} />
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-700)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            REALTIME QUEUE TOKEN
          </span>
        </div>
        <StatusBadge status={token.status} />
      </div>

      <div>
        <h3 style={{ fontSize: isSimple ? '1.6rem' : '1.35rem', color: 'var(--color-primary-900)' }}>
          {token.serviceName}
        </h3>
        <p style={{ fontSize: isSimple ? '1rem' : '0.9rem', color: 'var(--color-neutral-600)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <MapPin size={16} /> {token.officeName} • Counter {token.counterNumber}
        </p>
      </div>

      {/* Main Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          backgroundColor: 'var(--color-primary-50)',
          borderRadius: '14px',
          padding: isSimple ? '20px' : '16px',
          textAlign: 'center',
          border: '1px solid var(--color-primary-100)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Your Token</span>
          <div style={{ fontSize: isSimple ? '2.4rem' : '2rem', fontWeight: 800, color: 'var(--color-primary-800)' }}>
            {token.tokenNumber}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Now Serving</span>
          <div style={{ fontSize: isSimple ? '2.4rem' : '2rem', fontWeight: 800, color: 'var(--color-accent-600)' }}>
            A098
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Ahead of You</span>
          <div style={{ fontSize: isSimple ? '2.4rem' : '2rem', fontWeight: 800, color: 'var(--color-primary-700)' }}>
            {token.peopleAhead}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>Est. Arrival</span>
          <div style={{ fontSize: isSimple ? '2.4rem' : '2rem', fontWeight: 800, color: 'var(--color-success-700)' }}>
            {token.estimatedWaitMinutes}m
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-neutral-600)', fontWeight: 600 }}>
          <span>Queue Progress</span>
          <span>{token.peopleAhead > 0 ? `${token.peopleAhead} citizens remaining` : "It's your turn!"}</span>
        </div>
        <div style={{ height: '10px', backgroundColor: 'var(--color-neutral-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: 'var(--color-primary-700)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="primary" onClick={() => navigate('/user/queue')} icon={<ArrowRight size={18} />}>
          View Detailed Queue Tracker
        </Button>
        {onCancel && token.status === 'WAITING' && (
          <Button variant="danger" size="sm" onClick={() => onCancel(token.id)} icon={<XCircle size={16} />}>
            Cancel Token
          </Button>
        )}
      </div>
    </div>
  );
};
