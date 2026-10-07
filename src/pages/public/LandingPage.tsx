import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/Button';
import { QueueVisualizer } from '../../components/queue/QueueVisualizer';
import { ServiceCard } from '../../components/government/ServiceCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { AIAssistantWidget } from '../../components/assistant/AIAssistantWidget';
import { SUPPORTED_LANGUAGES } from '../../config/languages';
import {
  ArrowRight,
  Sparkles,
  Clock,
  FileCheck,
  ShieldCheck,
  Smartphone,
  Bell,
  CheckCircle2,
  Search,
  Bot,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { uiMode, t } = useUI();
  const { services } = useData();
  const navigate = useNavigate();
  const isSimple = uiMode === 'simple';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', paddingBottom: '80px' }}>
      {/* HERO SECTION */}
      <section
        style={{
          backgroundColor: 'var(--color-bg-page)',
          borderBottom: '1px solid var(--color-border)',
          padding: isSimple ? '60px 24px 80px' : '80px 24px 100px',
        }}
      >
        <div
          style={{
            width: '100%',
            padding: '0 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Value Prop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-accent-100)',
                color: 'var(--color-accent-700)',
                fontWeight: 700,
                fontSize: '0.85rem',
                width: 'fit-content',
              }}
            >
              <Sparkles size={16} /> Digital India Initiative for Citizens
            </div>

            <h1
              style={{
                fontSize: isSimple ? '3rem' : '2.75rem',
                color: 'var(--color-primary-900)',
                lineHeight: '1.15',
                letterSpacing: '-1px',
              }}
            >
              {t('heroTitle')}
            </h1>

            <p
              style={{
                fontSize: isSimple ? '1.25rem' : '1.1rem',
                color: 'var(--color-neutral-700)',
                lineHeight: '1.6',
              }}
            >
              {t('heroSub')}
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '8px' }}>
              <Button
                variant="primary"
                size={isSimple ? 'lg' : 'md'}
                onClick={() => navigate('/services')}
                icon={<Search size={20} />}
              >
                {t('findService')}
              </Button>
              <Button
                variant="saffron"
                size={isSimple ? 'lg' : 'md'}
                onClick={() => navigate('/services')}
                icon={<ArrowRight size={20} />}
              >
                {t('getStarted')}
              </Button>
            </div>

            {/* Quick Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-neutral-200)',
              }}
            >
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-700)' }}>85%</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Lobby Queue Reduction</p>
              </div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-700)' }}>{services.length}</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Govt Services Integrated</p>
              </div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-600)' }}>100%</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600)' }}>Digital Transparency</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Queue Transformation */}
          <div>
            <QueueVisualizer />
          </div>
        </div>
      </section>

      {/* POPULAR GOVERNMENT SERVICES */}
      <section style={{ width: '100%', padding: '0 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Service Catalog
            </span>
            <h2 style={{ fontSize: isSimple ? '2.2rem' : '1.8rem', color: 'var(--color-primary-900)', marginTop: '4px' }}>
              Popular Government Services
            </h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/services')} icon={<ArrowRight size={18} />}>
            View All Services ({services.length})
          </Button>
        </div>

        {services.length === 0 ? (
          <EmptyState
            title="No services available yet"
            description="Government services catalog will appear here once added to the database."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {services.slice(0, 6).map((srv) => (
              <ServiceCard key={srv.id} service={srv} onApply={() => navigate(`/services/${srv.id}`)} />
            ))}
          </div>
        )}
      </section>

      {/* HOW NAGRIKQ WORKS (6 STEPS) */}
      <section id="how-it-works" style={{ backgroundColor: 'var(--color-bg-card)', padding: '80px 32px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', width: '100%' }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px' }}>
            <span style={{ color: 'var(--color-accent-600)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Step-by-Step Guidance
            </span>
            <h2 style={{ fontSize: isSimple ? '2.4rem' : '2rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
              How NagrikQ Eliminates physical waiting
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {[
              { step: '1', title: 'Find Service', desc: 'Browse requirements & eligibility for your target service.' },
              { step: '2', title: 'Check Documents', desc: 'Verify exact document checklist using AI guidance.' },
              { step: '3', title: 'Virtual Token', desc: 'Get your digital queue token directly on your phone.' },
              { step: '4', title: 'Track Queue', desc: 'Monitor current serving tokens and live ETA in real time.' },
              { step: '5', title: 'Visit Office', desc: 'Arrive at the Jan Seva office exactly when your turn approaches.' },
              { step: '6', title: 'Complete Service', desc: 'Officer verifies documents and issues certificate swiftly.' },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  backgroundColor: 'var(--color-bg-page)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-700)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.step}
                </div>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--color-primary-900)' }}>{item.title}</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)', lineHeight: '1.5' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI ASSISTANT SECTION */}
      <section id="ai-assistant" style={{ width: '100%', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--color-primary-700)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Instant Answers 24/7
            </span>
            <h2 style={{ fontSize: isSimple ? '2.4rem' : '2rem', color: 'var(--color-primary-900)', marginTop: '6px' }}>
              AI Government Policy Assistant
            </h2>
            <p style={{ fontSize: isSimple ? '1.15rem' : '1rem', color: 'var(--color-neutral-700)', marginTop: '16px', lineHeight: '1.6' }}>
              No more confusing government circulars or ambiguous document requirements. Ask questions in natural language, and get exact rules cited directly from official government gazettes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
                <CheckCircle2 size={20} style={{ color: 'var(--color-success-700)' }} /> Instant document requirements verification
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
                <CheckCircle2 size={20} style={{ color: 'var(--color-success-700)' }} /> Cited source references to official rules
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
                <CheckCircle2 size={20} style={{ color: 'var(--color-success-700)' }} /> Multi-language conversational support
              </div>
            </div>
          </div>

          <div>
            <AIAssistantWidget />
          </div>
        </div>
      </section>

      {/* WHY NAGRIKQ */}
      <section style={{ backgroundColor: 'var(--color-bg-card)', padding: '80px 32px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', width: '100%' }}>
        <div style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px' }}>
            <h2 style={{ fontSize: isSimple ? '2.4rem' : '2rem', color: 'var(--color-primary-900)' }}>
              Why Citizens Choose NagrikQ
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              { icon: <Clock size={28} />, title: 'Zero Waiting Time', desc: 'Get your virtual token online and arrive only when your turn comes.' },
              { icon: <FileCheck size={28} />, title: 'Clear Requirements', desc: 'Know exact document specifications before stepping out of your home.' },
              { icon: <Smartphone size={28} />, title: 'Realtime Tracker', desc: 'Track counter queue positions live on your smartphone.' },
              { icon: <Bot size={28} />, title: 'AI Guided Help', desc: 'Instant multi-language guidance on eligibility and application steps.' },
              { icon: <Bell size={28} />, title: 'Smart Alerts', desc: 'Receive automatic notifications when your token is 3 steps away.' },
              { icon: <ShieldCheck size={28} />, title: 'Secure & Verified', desc: 'Direct government office verification with complete audit log trails.' },
            ].map((card, idx) => (
              <div
                key={idx}
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-page)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ color: 'var(--color-primary-700)' }}>{card.icon}</div>
                <h4 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>{card.title}</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-neutral-600)', lineHeight: '1.5' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED LANGUAGES */}
      <section style={{ width: '100%', padding: '0 32px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary-900)', marginBottom: '20px' }}>
          Accessible in Your Native Language
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <div
              key={l.code}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                padding: '16px 28px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{l.flag}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-primary-900)' }}>{l.nativeName}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{l.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
