import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';
import { AdaptiveOnboardingModal } from '../components/onboarding/AdaptiveOnboardingModal';

export const PublicLayout: React.FC = () => {
  return (
    <div className="panel-public" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-page)' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <AdaptiveOnboardingModal />
    </div>
  );
};
