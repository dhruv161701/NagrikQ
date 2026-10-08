import React from 'react';
import { useUI } from '../../context/UIContext';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  className = '',
  style,
  ...props
}) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontWeight: 600,
            fontSize: isSimple ? '1.05rem' : '0.9rem',
            color: 'var(--color-neutral-800)',
          }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={{
          width: '100%',
          height: isSimple ? '52px' : '44px',
          fontSize: isSimple ? '1.1rem' : '1rem',
          padding: '0 14px',
          border: `1.5px solid ${error ? 'var(--color-error-500)' : 'var(--color-neutral-300)'}`,
          borderRadius: isSimple ? '12px' : '10px',
          backgroundColor: 'var(--color-white)',
          color: 'var(--color-neutral-900)',
          outline: 'none',
          boxSizing: 'border-box',
          cursor: 'pointer',
          ...style,
        }}
        className={className}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-error-700)', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};
