import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { QuickActionModal } from './components/QuickActionModal';
import { InstallPWA } from './components/InstallPWA';
import { BrandLogo } from './components/BrandLogo';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { HackathonsView } from './views/HackathonsView';
import { MoneyView } from './views/MoneyView';
import { AnalyticsView } from './views/AnalyticsView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { LearningView } from './views/LearningView';

const SplashLoader: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface px-6">
    <div className="flex flex-col items-center gap-5 animate-in fade-in duration-200">
      <BrandLogo variant="full" className="h-12 sm:h-14 w-auto" />
      <div className="flex items-center gap-2.5 text-sm font-medium text-on-surface-variant">
        <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Restoring your workspace...</span>
      </div>
    </div>
  </div>
);

const MainShell: React.FC = () => {
  const { isAuthenticated, isPasswordRecovery, isLoading, activeTab } = useApp();

  if (isLoading && !isAuthenticated) {
    return (
      <>
        <SplashLoader />
        <ToastContainer />
      </>
    );
  }

  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <>
        <AuthView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row font-sans selection:bg-primary/25 selection:text-on-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-18 md:pt-6 pb-24 md:pb-10 transition-all">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'hackathons' && <HackathonsView />}
          {activeTab === 'money' && <MoneyView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {(activeTab === 'profile' || activeTab === 'settings') && <ProfileSettingsView />}
          {activeTab === 'learning' && <LearningView />}
        </main>
      </div>
      <BottomNav />
      <QuickActionModal />
      <InstallPWA />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}