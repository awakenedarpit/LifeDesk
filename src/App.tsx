/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import './services/googleCalendarAutoSyncPatch';
import { syncGoogleCalendarToLifeDesk } from './services/googleCalendarSync';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { QuickActionModal } from './components/QuickActionModal';
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

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const pull = async () => {
      if (cancelled) return;
      const result = await syncGoogleCalendarToLifeDesk();
      if (result.ok && (result.created || result.updated || result.deleted)) {
        window.dispatchEvent(new CustomEvent('lifedesk-google-calendar-updated', {
          detail: result,
        }));
      }
    };

    // Pull immediately after authentication, then periodically while LifeDesk
    // is open. This gives Google -> LifeDesk synchronization without changing
    // the existing task workflow or requiring a manual Sync button.
    void pull();
    const interval = window.setInterval(() => void pull(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

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
        <Header />

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
