import React from 'react';
import { useUI } from '../../context/UIContext';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  padding,
  className = '',
  style,
  ...props
}) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  const defaultPadding = padding || (isSimple ? '28px' : '24px');

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: isSimple ? '14px' : '16px',
        padding: defaultPadding,
        boxShadow: 'var(--shadow-xs)',
        transition: hoverable ? 'all 0.2s ease-in-out' : 'none',
        cursor: hoverable ? 'pointer' : 'default',
        ...style,
      }}
      className={`card ${hoverable ? 'hoverable-card' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
