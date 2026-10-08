import React from 'react';
import type { Service } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FileText, ShieldCheck, Home, Baby, FileMinus, Award, UserCheck, Clock, CheckSquare, ArrowRight } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface ServiceCardProps {
  service: Service;
  onApply?: (service: Service) => void;
}

const getServiceIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileText': return <FileText size={24} />;
    case 'ShieldCheck': return <ShieldCheck size={24} />;
    case 'Home': return <Home size={24} />;
    case 'Baby': return <Baby size={24} />;
    case 'FileMinus': return <FileMinus size={24} />;
    case 'Award': return <Award size={24} />;
    case 'UserCheck': return <UserCheck size={24} />;
    default: return <FileText size={24} />;
  }
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onApply }) => {
  const { uiMode } = useUI();
  const { currentUser } = useAuth();
  const isSimple = uiMode === 'simple';
  const navigate = useNavigate();

  const handleApplyClick = () => {
    if (!currentUser) {
      navigate(`/login?redirect=${encodeURIComponent(`/services/${service.id}`)}`);
      return;
    }
    if (onApply) {
      onApply(service);
    } else {
      navigate(`/services/${service.id}`);
    }
  };

  return (
    <Card hoverable style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary-100)',
              color: 'var(--color-primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {getServiceIcon(service.iconName)}
          </div>
          <Badge variant="blue">{service.category}</Badge>
        </div>

        <div>
          <h3 style={{ fontSize: isSimple ? '1.4rem' : '1.15rem', color: 'var(--color-neutral-950)' }}>
            {service.name}
          </h3>
          <p style={{ fontSize: isSimple ? '1rem' : '0.88rem', color: 'var(--color-neutral-600)', marginTop: '6px', lineHeight: '1.5' }}>
            {service.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--color-neutral-700)', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-neutral-100)', padding: '4px 8px', borderRadius: '6px' }}>
            <CheckSquare size={14} style={{ color: 'var(--color-primary-700)' }} /> {service.requiredDocuments.length} Documents Required
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-neutral-100)', padding: '4px 8px', borderRadius: '6px' }}>
            <Clock size={14} style={{ color: 'var(--color-accent-600)' }} /> ~{service.processingTimeDays} Days
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-neutral-200)' }}>
        <Button
          variant="secondary"
          size={isSimple ? 'lg' : 'sm'}
          style={{ flex: 1 }}
          onClick={() => navigate(`/services/${service.id}`)}
        >
          View Details
        </Button>
        <Button
          variant="primary"
          size={isSimple ? 'lg' : 'sm'}
          style={{ flex: 1 }}
          onClick={handleApplyClick}
          icon={<ArrowRight size={16} />}
        >
          {currentUser ? 'Apply' : 'Login to Apply'}
        </Button>
      </div>
    </Card>
  );
};
