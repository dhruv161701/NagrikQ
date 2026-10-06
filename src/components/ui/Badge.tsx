import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  let bg = 'var(--color-neutral-200)';
  let color = 'var(--color-neutral-800)';

  switch (variant) {
    case 'blue':
      bg = 'var(--color-info-100)';
      color = 'var(--color-info-700)';
      break;
    case 'green':
      bg = 'var(--color-success-100)';
      color = 'var(--color-success-700)';
      break;
    case 'orange':
      bg = 'var(--color-warning-100)';
      color = 'var(--color-warning-700)';
      break;
    case 'red':
      bg = 'var(--color-error-100)';
      color = 'var(--color-error-700)';
      break;
    case 'purple':
      bg = '#F3E8FF';
      color = '#6B21A8';
      break;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        fontSize: size === 'sm' ? '0.75rem' : '0.85rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        backgroundColor: bg,
        color: color,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};
