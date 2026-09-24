/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { QuickActionModal } from './components/QuickActionModal';
import { SyncButton } from './components/SyncButton';
import { GoogleCalendarConnect } from './components/GoogleCalendarConnect';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { HackathonsView } from './views/HackathonsView';
import { MoneyView } from './views/MoneyView';
import { AnalyticsView } from './views/AnalyticsView';
import { ProfileSettingsView } from './views/ProfileSettingsView';

const MainShell: React.FC = () => {
  const { isAuthenticated, activeTab } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <AuthView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row font-sans selection:bg-primary/20 selection:text-primary">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative">
          <Header />
          <div className="fixed md:absolute top-14 md:top-3 right-3 sm:right-6 lg:right-8 z-50">
            <SyncButton />
          </div>
        </div>

        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-18 md:pt-6 pb-24 md:pb-10 transition-all">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'hackathons' && <HackathonsView />}
          {activeTab === 'money' && <MoneyView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'profile' && (
            <>
              <ProfileSettingsView />
              <div className="mt-3 sm:mt-4 lg:mt-5 max-w-4xl mx-auto">
                <GoogleCalendarConnect />
              </div>
            </>
          )}
        </main>
      </div>

      <BottomNav />
      <QuickActionModal />
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
