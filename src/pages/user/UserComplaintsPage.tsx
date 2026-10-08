import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MessageSquarePlus, CheckCircle2, Send } from 'lucide-react';

export const UserComplaintsPage: React.FC = () => {
  const [subject, setSubject] = useState<string>('');
  const [applicationId, setApplicationId] = useState<string>('APP-2026-89421');
  const [description, setDescription] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [complaints, setComplaints] = useState([
    {
      id: 'CMP-101',
      subject: 'Delay in Document Verification for Income Certificate',
      applicationId: 'APP-2026-89421',
      description: 'Application has been pending verification at Counter C-04 for 2 days.',
      status: 'UNDER_INVESTIGATION',
      submittedAt: new Date(Date.now() - 86400000).toLocaleDateString('en-IN'),
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    const newComplaint = {
      id: `CMP-${Math.floor(100 + Math.random() * 900)}`,
      subject,
      applicationId: applicationId || 'N/A',
      description,
      status: 'PENDING',
      submittedAt: new Date().toLocaleDateString('en-IN'),
    };

    setComplaints([newComplaint, ...complaints]);
    setSubmitted(true);
    setSubject('');
    setDescription('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary-900)' }}>
          Grievances & Complaints
        </h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: '4px' }}>
          Submit feedback, report counter delays, or request clarification regarding your application.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Submit Form */}
        <Card style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-700)' }}>
              <MessageSquarePlus size={20} />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>File a New Grievance</h3>
          </div>

          {submitted && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} /> Grievance filed successfully! Assigned tracking ID.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                Application ID (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. APP-2026-89421"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                Subject / Title *
              </label>
              <Input
                type="text"
                placeholder="e.g. Counter Delay or Document Rejection Query"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-neutral-700)' }}>
                Detailed Description *
              </label>
              <textarea
                rows={4}
                placeholder="Describe your issue or feedback in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-neutral-300)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <Button type="submit" variant="primary" icon={<Send size={16} />}>
              Submit Grievance
            </Button>
          </form>
        </Card>

        {/* Complaints History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-900)' }}>Your Grievance History</h3>
          {complaints.map((c) => (
            <Card key={c.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-900)', fontSize: '1rem' }}>
                  {c.id}
                </span>
                <StatusBadge status={c.status} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-900)' }}>
                {c.subject}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600)', lineHeight: 1.4 }}>
                {c.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-neutral-500)', paddingTop: '8px', borderTop: '1px solid var(--color-neutral-200)' }}>
                <span>App ID: {c.applicationId}</span>
                <span>Submitted: {c.submittedAt}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
