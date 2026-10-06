import React from 'react';
import { Clock, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { useUI } from '../../context/UIContext';

export const QueueVisualizer: React.FC = () => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-neutral-200)',
        borderRadius: isSimple ? '16px' : '20px',
        padding: isSimple ? '28px' : '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--color-accent-700)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Smart Virtual Queue System
          </span>
          <h3 style={{ fontSize: isSimple ? '1.5rem' : '1.3rem', color: 'var(--color-primary-900)', marginTop: '4px' }}>
            Queue Transformation Architecture
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-success-100)', color: 'var(--color-success-700)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.85rem' }}>
          <Clock size={16} /> Save ~1.5 Hours Per Visit
        </div>
      </div>

      {/* Traditional Flow vs NagrikQ Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {/* Traditional */}
        <div
          style={{
            backgroundColor: 'var(--color-error-100)',
            border: '1px solid #FECDCA',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-error-700)', fontSize: '0.9rem' }}>
              ❌ TRADITIONAL PHYSICAL QUEUE
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-error-700)', fontWeight: 600 }}>Avg Wait: 120+ mins</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-neutral-800)', fontWeight: 500 }}>
            <span>Arrive Office</span> <ArrowRight size={14} />
            <span>Take Paper Token</span> <ArrowRight size={14} />
            <span style={{ color: 'var(--color-error-700)', fontWeight: 700 }}>Wait in Crowd</span> <ArrowRight size={14} />
            <span>Missing Document?</span> <ArrowRight size={14} />
            <span style={{ color: 'var(--color-error-700)', fontWeight: 700 }}>Return Next Day</span>
          </div>
        </div>

        {/* NagrikQ Flow */}
        <div
          style={{
            backgroundColor: 'var(--color-primary-50)',
            border: '2px solid var(--color-primary-600)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-primary-700)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={18} /> NAGRIKQ VIRTUAL QUEUE
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-success-700)', fontWeight: 700 }}>Avg Office Wait: ~5 mins</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-neutral-900)', fontWeight: 600 }}>
            <span style={{ background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-primary-200)' }}>1. Find Service</span> <ArrowRight size={14} />
            <span style={{ background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-primary-200)' }}>2. Check Docs</span> <ArrowRight size={14} />
            <span style={{ background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-primary-200)' }}>3. Virtual Token</span> <ArrowRight size={14} />
            <span style={{ background: 'white', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-primary-200)' }}>4. Track Live</span> <ArrowRight size={14} />
            <span style={{ background: 'var(--color-success-500)', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>5. Direct Counter Service</span>
          </div>
        </div>
      </div>

      {/* Live Sample Token Preview Card */}
      <div
        style={{
          backgroundColor: 'var(--color-primary-900)',
          color: 'white',
          borderRadius: '14px',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Your Token</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-accent-500)' }}>A104</div>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Now Serving</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white' }}>A098</div>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>People Ahead</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#93C5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Users size={24} /> 6
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Estimated Wait</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#86EFAC' }}>24m</div>
        </div>
      </div>
    </div>
  );
};
