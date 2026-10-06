import React from 'react';
import { useUI } from '../../context/UIContext';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  id,
  className = '',
  style,
  ...props
}) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontWeight: 600,
            fontSize: isSimple ? '1.05rem' : '0.9rem',
            color: 'var(--color-neutral-800)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--color-neutral-500)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          style={{
            width: '100%',
            height: isSimple ? '52px' : '44px',
            fontSize: isSimple ? '1.1rem' : '1rem',
            paddingLeft: icon ? '42px' : '14px',
            paddingRight: '14px',
            border: `1.5px solid ${error ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
            borderRadius: isSimple ? '12px' : '10px',
            backgroundColor: 'var(--color-white)',
            color: 'var(--color-neutral-900)',
            outline: 'none',
            boxSizing: 'border-box',
            ...style,
          }}
          className={className}
          {...props}
        />
      </div>
      {error ? (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-error-700)', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
