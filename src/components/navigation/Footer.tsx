import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, MapPin, Building2, Lock, UserCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-neutral-950)',
        color: 'var(--color-white)',
        padding: '60px 24px 30px',
        marginTop: 'auto',
        borderTop: '3px solid var(--color-accent-600)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '36px',
          paddingBottom: '40px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Brand Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-700)',
                color: 'var(--color-accent-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
              }}
            >
              Q
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
              Nagrik<span style={{ color: 'var(--color-accent-500)' }}>Q</span>
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-neutral-400)', lineHeight: '1.6' }}>
            Empowering citizens with AI-powered government service discovery, digital document verification, and zero-wait virtual queues.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-accent-500)', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Official Government Service Gateway
          </div>
        </div>

        {/* Services Links */}
        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '16px' }}>Popular Services</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--color-neutral-400)' }}>
            <li><Link to="/services" style={{ color: 'inherit' }}>Income Certificate</Link></li>
            <li><Link to="/services" style={{ color: 'inherit' }}>Caste Certificate</Link></li>
            <li><Link to="/services" style={{ color: 'inherit' }}>Residence / Domicile Certificate</Link></li>
            <li><Link to="/services" style={{ color: 'inherit' }}>Birth & Death Certificate</Link></li>
            <li><Link to="/services" style={{ color: 'inherit' }}>Senior Citizen Identity Card</Link></li>
            <li><Link to="/services" style={{ color: 'inherit' }}>Non-Creamy Layer Certificate</Link></li>
          </ul>
        </div>

        {/* Government Staff / Officer Portals (IDP ONLY - NO GOOGLE) */}
        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-accent-500)' }} /> Staff & Officer Portals
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--color-neutral-400)' }}>
            <li>
              <Link to="/staff-login?role=employee" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={15} style={{ color: 'var(--color-accent-500)', flexShrink: 0 }} />
                <span>Officer / Employee Portal</span>
              </Link>
            </li>
            <li>
              <Link to="/staff-login?role=admin" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={15} style={{ color: 'var(--color-accent-500)', flexShrink: 0 }} />
                <span>Department Admin Portal</span>
              </Link>
            </li>
            <li>
              <Link to="/staff-login?role=superadmin" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={15} style={{ color: 'var(--color-accent-500)', flexShrink: 0 }} />
                <span>Super Admin Gateway</span>
              </Link>
            </li>
            <li style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--color-neutral-500)', lineHeight: '1.4' }}>
              🔒 Government IDP credentials required. Self-registration is disabled for official staff.
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '16px' }}>Platform Info</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: 'var(--color-neutral-400)' }}>
            <li><a href="#how-it-works" style={{ color: 'inherit' }}>How NagrikQ Works</a></li>
            <li><a href="#ai-assistant" style={{ color: 'inherit' }}>AI Assistant Guidelines</a></li>
            <li><a href="#help" style={{ color: 'inherit' }}>Jan Seva Center Directory</a></li>
            <li><a href="#" style={{ color: 'inherit' }}>Privacy Policy</a></li>
            <li><a href="#" style={{ color: 'inherit' }}>Terms of Service</a></li>
            <li><a href="#" style={{ color: 'inherit' }}>Accessibility Statement</a></li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '16px' }}>Helpline & Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: 'var(--color-neutral-400)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={16} style={{ color: 'var(--color-accent-500)' }} /> Toll Free Helpline: 1800-233-5500
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} style={{ color: 'var(--color-accent-500)' }} /> support@nagrikq.gov.in
            </span>
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={16} style={{ color: 'var(--color-accent-500)', flexShrink: 0, marginTop: '2px' }} /> State Secretariat, Block 7, Gandhinagar, Gujarat - 382010
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '20px auto 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--color-neutral-500)',
        }}
      >
        <span>© 2026 NagrikQ Digital Seva Platform. Designed for Government of Gujarat & National Digital India Mission.</span>
        <span>Supported Languages: English • ગુજરાતી • हिन्दी</span>
      </div>
    </footer>
  );
};
