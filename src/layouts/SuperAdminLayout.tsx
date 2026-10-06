import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { Sidebar } from '../components/navigation/Sidebar';

export const SuperAdminLayout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-neutral-100)' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '28px 32px', minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
