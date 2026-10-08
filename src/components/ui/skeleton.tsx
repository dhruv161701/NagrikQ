import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

// Standard shadcn/ui Skeleton component with warm government cream palette
export function Skeleton({ className, shimmer = true, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        shimmer ? 'skeleton-shimmer' : 'animate-pulse-subtle',
        className
      )}
      style={{
        backgroundColor: 'var(--color-border-subtle)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
      {...props}
    />
  );
}

// Reusable shadcn Card Skeleton loader
export const SkeletonCard: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      ...style,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton style={{ height: '24px', width: '45%' }} />
      <Skeleton style={{ height: '26px', width: '70px', borderRadius: 'var(--radius-full)' }} />
    </div>
    <Skeleton style={{ height: '16px', width: '85%' }} />
    <Skeleton style={{ height: '16px', width: '65%' }} />
    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
      <Skeleton style={{ height: '38px', width: '120px', borderRadius: '8px' }} />
      <Skeleton style={{ height: '38px', width: '100px', borderRadius: '8px' }} />
    </div>
  </div>
);

// Reusable shadcn Table Skeleton loader
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div
    style={{
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      width: '100%',
    }}
  >
    <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} style={{ height: '20px', flex: 1 }} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '10px 0' }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} style={{ height: '16px', flex: 1 }} />
        ))}
      </div>
    ))}
  </div>
);

// Reusable shadcn Dashboard Metrics Skeleton loader
export const SkeletonMetrics: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
      gap: '20px',
      width: '100%',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton style={{ height: '16px', width: '60%' }} />
          <Skeleton style={{ height: '24px', width: '24px', borderRadius: '6px' }} />
        </div>
        <Skeleton style={{ height: '36px', width: '45%' }} />
        <Skeleton style={{ height: '14px', width: '70%' }} />
      </div>
    ))}
  </div>
);
