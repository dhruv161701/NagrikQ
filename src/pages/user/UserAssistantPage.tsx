import React from 'react';
import { AIAssistantWidget } from '../../components/assistant/AIAssistantWidget';
import { useUI } from '../../context/UIContext';

export const UserAssistantPage: React.FC = () => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: isSimple ? '2.4rem' : '1.8rem', color: 'var(--color-primary-900)' }}>
          AI Citizen Assistant
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', fontSize: isSimple ? '1.1rem' : '0.95rem', marginTop: '4px' }}>
          Ask any question regarding government certificates, required documents, or process timelines.
        </p>
      </div>

      <AIAssistantWidget />
    </div>
  );
};
