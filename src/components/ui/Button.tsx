import React from 'react';
import { useUI } from '../../context/UIContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'saffron';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: isSimple ? 700 : 600,
    fontSize: isSimple ? '1.1rem' : size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
    borderRadius: isSimple ? '12px' : '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease-in-out',
    border: '1px solid transparent',
    padding: isSimple
      ? '14px 24px'
      : size === 'sm'
      ? '6px 14px'
      : size === 'lg'
      ? '12px 24px'
      : '10px 20px',
    minHeight: isSimple ? '52px' : size === 'sm' ? '36px' : size === 'lg' ? '48px' : '44px',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  let variantStyles: React.CSSProperties = {};

  switch (variant) {
    case 'primary':
    case 'saffron':
      variantStyles = {
        backgroundColor: 'var(--color-primary)',
        color: '#FFFFFF',
        borderColor: 'var(--color-primary)',
        boxShadow: 'var(--shadow-xs)',
      };
      break;
    case 'secondary':
      variantStyles = {
        backgroundColor: 'var(--color-secondary)',
        color: '#FFFFFF',
        borderColor: 'var(--color-secondary)',
        boxShadow: 'var(--shadow-xs)',
      };
      break;
    case 'outline':
      variantStyles = {
        backgroundColor: 'transparent',
        color: 'var(--color-neutral)',
        borderColor: 'var(--color-neutral)',
      };
      break;
    case 'tertiary':
      variantStyles = {
        backgroundColor: 'transparent',
        color: 'var(--color-primary)',
      };
      break;
    case 'danger':
      variantStyles = {
        backgroundColor: 'var(--color-error)',
        color: '#FFFFFF',
        borderColor: 'var(--color-error)',
      };
      break;
  }

  return (
    <button
      style={{ ...baseStyles, ...variantStyles }}
      disabled={disabled}
      className={`btn-${variant} ${className}`}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
};
