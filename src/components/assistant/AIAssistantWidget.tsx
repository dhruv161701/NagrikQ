import React, { useState } from 'react';
import { Bot, Send, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUI } from '../../context/UIContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: string;
}

export interface AIAssistantWidgetProps {
  initialContextService?: string;
}

const SUGGESTED_QUESTIONS = [
  'What documents do I need for an income certificate?',
  'How long does a Non-Creamy Layer certificate take?',
  'Who is eligible for a Senior Citizen ID Card?',
  'How do I track my virtual queue token status?',
];

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ initialContextService }) => {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: initialContextService
        ? `Namaste! I am NagrikQ AI Assistant. I can answer all specific questions regarding ${initialContextService} document requirements, eligibility, and process rules.`
        : `Namaste! I am NagrikQ AI Assistant. I can answer questions about required documents, eligibility, processes, and queue tracking for all government services in Gujarat. How can I help you today?`,
      sources: ['Gujarat Digital Seva Portal', 'Revenue Department Circular 2026'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    setTimeout(() => {
      let reply = `To apply for an Income Certificate in Gujarat, you currently require 4 primary verified documents:\n1. Aadhaar Card (Applicant)\n2. Address Proof (Electricity Bill or Ration Card)\n3. Income Proof (Form 16 / Salary Slip / Income Affidavit)\n4. Recent Passport Photograph\n\nOnce uploaded, processing takes approximately 3 working days. You will receive a Virtual Queue Token upon scheduling your office visit.`;
      let sources = ['Revenue Dept Gazette Notification #GR-2025-91', 'Digital Seva Portal Rules'];

      if (text.toLowerCase().includes('senior') || text.toLowerCase().includes('elder')) {
        reply = `For a Senior Citizen Identity Card (60+ years):\n1. Age Proof (Aadhaar / Passport / School Leaving Cert)\n2. Address Proof\n3. 2 Passport Photographs\n\nFee is ₹0 (Free service) and processing is completed within 24 hours.`;
        sources = ['Social Welfare Dept Guidelines'];
      } else if (text.toLowerCase().includes('queue') || text.toLowerCase().includes('token')) {
        reply = `You can get a Virtual Queue Token directly through NagrikQ after selecting your target office. Once generated, your token will update in realtime. Arrive when there are 2-3 people ahead to avoid any lobby waiting!`;
        sources = ['NagrikQ Queue Management Standard Operating Procedure'];
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-neutral-200)',
        borderRadius: isSimple ? '16px' : '20px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--color-primary-900)',
          color: 'var(--color-white)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent-600)' }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <h4 style={{ color: 'white', margin: 0, fontSize: isSimple ? '1.2rem' : '1rem' }}>
              NagrikQ AI Citizen Assistant {initialContextService ? `(${initialContextService})` : ''}
            </h4>
            <span style={{ fontSize: '0.78rem', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> Powered by RAG + Gemini AI (Interface Ready)
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--color-neutral-100)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '14px 18px',
                borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                backgroundColor: msg.sender === 'user' ? 'var(--color-primary-700)' : 'var(--color-white)',
                color: msg.sender === 'user' ? 'white' : 'var(--color-neutral-900)',
                border: msg.sender === 'assistant' ? '1px solid var(--color-neutral-200)' : 'none',
                boxShadow: 'var(--shadow-xs)',
                fontSize: isSimple ? '1.1rem' : '0.98rem',
                whiteSpace: 'pre-line',
                lineHeight: '1.6',
              }}
            >
              {msg.text}

              {/* Source References */}
              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--color-neutral-200)',
                    fontSize: '0.8rem',
                    color: 'var(--color-neutral-600)',
                  }}
                >
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary-700)' }}>
                    <BookOpen size={13} /> Sources & Official References:
                  </span>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px', margin: 0 }}>
                    {msg.sources.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)', marginTop: '4px' }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-neutral-600)', padding: '12px' }}>
            <RefreshCw size={18} className="animate-pulse-subtle" /> AI is fetching government policy documents...
          </div>
        )}
      </div>

      {/* Suggested Questions Pills */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--color-white)',
          borderTop: '1px solid var(--color-neutral-200)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-primary-200)',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-800)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            💡 {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: 'var(--color-white)',
          borderTop: '1px solid var(--color-neutral-200)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <Input
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about any government service..."
        />
        <Button variant="primary" onClick={() => handleSend()} disabled={isLoading || !inputQuery.trim()} icon={<Send size={18} />}>
          Send
        </Button>
      </div>
    </div>
  );
};
