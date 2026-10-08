import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--color-white)',
        border: '1px dashed var(--color-neutral-300)',
        borderRadius: 'var(--radius-lg)',
        gap: '16px',
        width: '100%',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-neutral-100)',
          color: 'var(--color-neutral-500)',
        }}
      >
        {icon || <FolderOpen size={40} />}
      </div>
      <div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-neutral-900)' }}>{title}</h3>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px', maxWidth: '400px' }}>
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
