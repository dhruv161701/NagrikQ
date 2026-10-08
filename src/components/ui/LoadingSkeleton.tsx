import React from 'react';
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonMetrics } from './skeleton';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonMetrics };

export const LoadingSkeleton: React.FC<{ height?: string; width?: string; count?: number }> = ({
  height = '48px',
  width = '100%',
  count = 3,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            height,
            width,
          }}
        />
      ))}
    </div>
  );
};
