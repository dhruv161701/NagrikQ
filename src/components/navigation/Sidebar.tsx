import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  LayoutDashboard,
  FileText,
  Clock,
  FolderOpen,
  Bot,
  Settings,
  Users,
  Building,
  BarChart3,
  FileCheck,
  GitPullRequest,
  History,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { activeRole, currentUser } = useAuth();
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  let items: SidebarItem[] = [];

  if (activeRole === 'citizen') {
    items = [
      { label: 'Dashboard', path: '/user/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Services', path: '/user/services', icon: <FileText size={20} /> },
      { label: 'My Applications', path: '/user/applications', icon: <FolderOpen size={20} /> },
      { label: 'My Queue Token', path: '/user/queue', icon: <Clock size={20} /> },
      { label: 'Document Vault', path: '/user/documents', icon: <FileCheck size={20} /> },
      { label: 'AI Assistant', path: '/user/assistant', icon: <Bot size={20} /> },
      { label: 'Settings', path: '/user/settings', icon: <Settings size={20} /> },
    ];
  } else if (activeRole === 'employee') {
    items = [
      { label: 'Dashboard', path: '/employee/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Live Counter Queue', path: '/employee/queue', icon: <Clock size={20} /> },
      { label: 'Applications', path: '/employee/applications', icon: <FolderOpen size={20} /> },
      { label: 'Settings', path: '/employee/settings', icon: <Settings size={20} /> },
    ];
  } else if (activeRole === 'admin') {
    items = [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Employees', path: '/admin/employees', icon: <Users size={20} /> },
      { label: 'Services Catalog', path: '/admin/services', icon: <FileText size={20} /> },
      { label: 'Document Requirements', path: '/admin/document-requirements', icon: <FileCheck size={20} /> },
      { label: 'Change Requests', path: '/admin/change-requests', icon: <GitPullRequest size={20} /> },
      { label: 'Reports & Analytics', path: '/admin/reports', icon: <BarChart3 size={20} /> },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: <History size={20} /> },
    ];
  } else if (activeRole === 'superadmin') {
    items = [
      { label: 'Global Dashboard', path: '/super-admin/dashboard', icon: <LayoutDashboard size={20} /> },
      { label: 'Global Services Catalog', path: '/super-admin/services', icon: <FileText size={20} /> },
      { label: 'Change Requests Approval', path: '/super-admin/change-requests', icon: <GitPullRequest size={20} /> },
      { label: 'District Admins', path: '/super-admin/admins', icon: <Users size={20} /> },
      { label: 'Government Offices', path: '/super-admin/offices', icon: <Building size={20} /> },
      { label: 'System Audit Logs', path: '/super-admin/audit-logs', icon: <History size={20} /> },
      { label: 'System Settings', path: '/super-admin/settings', icon: <Settings size={20} /> },
    ];
  }

  return (
    <aside
      style={{
        width: '248px',
        backgroundColor: 'var(--color-white)',
        borderRight: '1px solid var(--color-neutral-200)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* User Persona Header */}
        <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--color-neutral-100)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-700)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {currentUser?.name ? currentUser.name[0] : 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-neutral-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name || 'Nagrik User'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-700)', fontWeight: 600, textTransform: 'capitalize' }}>
              {activeRole} Role
            </span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isSimple ? '14px 16px' : '10px 14px',
                borderRadius: '10px',
                fontSize: isSimple ? '1.05rem' : '0.92rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary-700)' : 'var(--color-neutral-700)',
                backgroundColor: isActive ? 'var(--color-primary-50)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* System Status footer */}
      <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--color-neutral-50)', border: '1px solid var(--color-neutral-200)', fontSize: '0.75rem', color: 'var(--color-neutral-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-success-700)' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success-500)' }} />
          NagrikQ Realtime Engine
        </div>
        <span style={{ marginTop: '2px', display: 'block' }}>Department of Digital Governance</span>
      </div>
    </aside>
  );
};
