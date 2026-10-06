import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Sparkles,
  FileSearch,
  FileCheck,
  Send,
  Ticket,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: '1. Discover Government Services',
      description: 'Easily search, filter, and explore official services across Revenue, Municipal, Social Welfare, and Education departments.',
      icon: <FileSearch size={32} style={{ color: 'var(--color-primary-700)' }} />,
      highlight: 'No complex portal navigation needed',
    },
    {
      title: '2. Dynamic Required Documents',
      description: 'Know exact document requirements in advance. Real-time updates ensure you always have the latest verified checklist before applying.',
      icon: <FileCheck size={32} style={{ color: 'var(--color-accent-600)' }} />,
      highlight: 'Zero missing document rejections',
    },
    {
      title: '3. Digital Application & Document Vault',
      description: 'Fill applications online and upload documents securely. Track verification status step-by-step from your citizen dashboard.',
      icon: <Send size={32} style={{ color: 'var(--color-info-700)' }} />,
      highlight: 'Encrypted document vault',
    },
    {
      title: '4. Instant Virtual Queue Tokens',
      description: 'Get a virtual queue token from anywhere. Avoid waiting in physical queues under heat or standing in long lines.',
      icon: <Ticket size={32} style={{ color: 'var(--color-primary-700)' }} />,
      highlight: 'Virtual token (e.g. A104)',
    },
    {
      title: '5. Live Realtime Queue Tracking',
      description: 'Track your exact position and estimated wait time live. Receive notifications when your token is called to Counter C-04.',
      icon: <Clock size={32} style={{ color: 'var(--color-success-700)' }} />,
      highlight: 'Arrive at the office right on time',
    },
  ];

  const step = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 24, 40, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <Card
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '32px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-neutral-500)',
          }}
          title="Close Tour"
        >
          <X size={20} />
        </button>

        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-primary-100)',
              color: 'var(--color-primary-700)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            <Sparkles size={14} /> Guided Tour ({currentStep + 1}/{tourSteps.length})
          </div>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: 'var(--color-neutral-100)',
              flexShrink: 0,
            }}
          >
            {step.icon}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary-900)' }}>
              {step.title}
            </h3>
            <p style={{ color: 'var(--color-neutral-600)', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {step.description}
            </p>
            <div
              style={{
                display: 'inline-block',
                marginTop: '4px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-primary-700)',
                backgroundColor: 'var(--color-primary-50)',
                padding: '4px 10px',
                borderRadius: '6px',
                width: 'fit-content',
              }}
            >
              ✓ {step.highlight}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-neutral-200)', borderRadius: '2px' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentStep + 1) / tourSteps.length) * 100}%`,
              backgroundColor: 'var(--color-primary-700)',
              borderRadius: '2px',
              transition: 'width 0.25s ease',
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-neutral-500)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev} icon={<ArrowLeft size={16} />}>
                Previous
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              icon={currentStep === tourSteps.length - 1 ? undefined : <ArrowRight size={16} />}
            >
              {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
