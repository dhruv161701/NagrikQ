import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColors = {
    success: '#F2F7F3',
    error: '#FEF2F2',
    info: '#F7F3E8',
    warning: '#FDF8F2',
  };

  const borderColors = {
    success: '#3F5F45',
    error: '#B91C1C',
    info: '#171717',
    warning: '#C77720',
  };

  const textColors = {
    success: '#3F5F45',
    error: '#B91C1C',
    info: '#171717',
    warning: '#C77720',
  };

  const icons = {
    success: <CheckCircle size={20} style={{ color: '#3F5F45', flexShrink: 0 }} />,
    error: <AlertCircle size={20} style={{ color: '#B91C1C', flexShrink: 0 }} />,
    info: <Info size={20} style={{ color: '#171717', flexShrink: 0 }} />,
    warning: <AlertTriangle size={20} style={{ color: '#C77720', flexShrink: 0 }} />,
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        backgroundColor: bgColors[toast.type],
        borderLeft: `5px solid ${borderColors[toast.type]}`,
        borderRadius: '8px',
        padding: '14px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transition: 'all 0.2s ease',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {icons[toast.type]}

      <div style={{ flex: 1 }}>
        <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: textColors[toast.type] }}>
          {toast.title}
        </h5>
        {toast.message && (
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--color-neutral-700)', lineHeight: '1.4' }}>
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-neutral-400)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
