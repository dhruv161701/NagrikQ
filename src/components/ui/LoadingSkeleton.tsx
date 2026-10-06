import React from 'react';

export const LoadingSkeleton: React.FC<{ height?: string; width?: string; count?: number }> = ({
  height = '48px',
  width = '100%',
  count = 3,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse-subtle"
          style={{
            height,
            width,
            backgroundColor: 'var(--color-neutral-200)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      ))}
    </div>
  );
};
