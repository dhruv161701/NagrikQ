import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  style,
  className,
}) => {
  let bg = 'var(--color-border-subtle)';
  let color = 'var(--color-text-primary)';

  switch (variant) {
    case 'blue':
    case 'info':
      bg = 'var(--color-border-subtle)';
      color = 'var(--color-text-primary)';
      break;
    case 'green':
    case 'success':
      bg = 'var(--color-success-100)';
      color = 'var(--color-success-600)';
      break;
    case 'orange':
    case 'warning':
      bg = 'var(--color-warning-100)';
      color = 'var(--color-warning-600)';
      break;
    case 'red':
    case 'danger':
      bg = 'var(--color-error-100)';
      color = 'var(--color-error-600)';
      break;
    case 'purple':
      bg = 'rgba(104, 74, 107, 0.12)';
      color = '#684A6B';
      break;
    case 'neutral':
      bg = 'var(--color-border-subtle)';
      color = 'var(--color-text-secondary)';
      break;
  }

  return (
    <span
      className={className}
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
        border: '1px solid rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </span>
  );
};
