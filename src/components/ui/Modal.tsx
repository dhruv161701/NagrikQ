import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../../context/UIContext';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = '560px',
}) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(23, 23, 23, 0.45)',
        backdropFilter: 'blur(3px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth,
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: isSimple ? '18px' : '16px',
          boxShadow: 'var(--shadow-md)',
          padding: isSimple ? '32px' : '24px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: description ? '8px' : '20px',
          }}
        >
          <div>
            <h3 style={{ fontSize: isSimple ? '1.5rem' : '1.25rem', color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            {description && (
              <p
                style={{
                  fontSize: isSimple ? '1rem' : '0.9rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '4px',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '6px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
