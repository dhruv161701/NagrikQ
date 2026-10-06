import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Database, Cpu, Zap } from 'lucide-react';

export const SuperAdminSettingsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--color-primary-900)' }}>
          System Architecture & Backend Integration Status
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Production architecture readiness status for future Supabase, Node/Express API, Gemini RAG, and n8n automations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Supabase */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
              <Database size={20} style={{ color: 'var(--color-success-700)' }} /> Supabase Integration Boundary
            </div>
            <Badge variant="green">Frontend SDK Connected</Badge>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
            Configured for Supabase Auth, PostgreSQL, Storage Buckets, Row Level Security (RLS), and Realtime subscription hooks.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)', backgroundColor: 'var(--color-neutral-100)', padding: '8px', borderRadius: '6px' }}>
            Client Repository Pattern: Isolated in <code>src/services/repositories.ts</code>
          </div>
        </Card>

        {/* Gemini RAG */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
              <Cpu size={20} style={{ color: '#6B21A8' }} /> Gemini AI & pgvector RAG Pipeline
            </div>
            <Badge variant="purple">UI Interface Ready</Badge>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
            Conversational RAG assistant interface prepared with source citations. Secrets isolated from frontend.
          </p>
        </Card>

        {/* n8n Automation */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-neutral-900)' }}>
              <Zap size={20} style={{ color: 'var(--color-accent-600)' }} /> n8n Workflow Automations
            </div>
            <Badge variant="orange">Webhook Listeners Ready</Badge>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-600)' }}>
            Event triggers for Application Status Change → SMS / Push / Email Digest automations.
          </p>
        </Card>
      </div>
    </div>
  );
};
