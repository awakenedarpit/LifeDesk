import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { QuickActionModal } from './components/QuickActionModal';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { HackathonsView } from './views/HackathonsView';
import { MoneyView } from './views/MoneyView';
import { AnalyticsView } from './views/AnalyticsView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { LearningView } from './views/LearningView';

const MainShell: React.FC = () => {
  const { isAuthenticated, activeTab } = useApp();
  if (!isAuthenticated) return <><AuthView /><ToastContainer /></>;
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row font-sans selection:bg-primary/20 selection:text-primary">
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
          {activeTab === 'profile' && <ProfileSettingsView />}
          {activeTab === 'learning' && <LearningView />}
        </main>
      </div>
      <BottomNav />
      <QuickActionModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return <AppProvider><MainShell /></AppProvider>;
}