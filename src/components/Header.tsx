import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AppNavTab } from '../types';

export const Header: React.FC = () => {
  const { theme, setTheme, activeTab, setActiveTab, user, deadlines, tasks, openModal } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const getSubhead = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'DASHBOARD';
      case 'tasks':
        return 'TASK MANAGER';
      case 'calendar':
        return 'CALENDAR';
      case 'hackathons':
        return 'HACKATHON SPRINTS';
      case 'money':
        return 'TREASURY & LEDGER';
      case 'analytics':
        return 'FINANCIAL ANALYTICS';
      case 'profile':
      case 'settings':
        return 'PROFILE & SETTINGS';
      default:
        return 'DASHBOARD';
    }
  };

  const urgentItems = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed');
  const dueSoonDeadlines = deadlines.filter((d) => d.status === 'Due Soon' || d.status === 'Upcoming');
  const totalAlerts = urgentItems.length + dueSoonDeadlines.length;

  return (
    <header className="fixed md:sticky top-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-b border-surface-container shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile: Logo + Title (Desktop logo is in Sidebar) */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none md:hidden min-w-0"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
          </div>
          <div className="flex flex-col truncate">
            <span className="font-headline-md text-base tracking-tight text-on-surface leading-tight font-bold">
              LifeDesk
            </span>
            <span className="font-label-xs text-[9px] text-primary font-semibold tracking-wider uppercase leading-none">
              {getSubhead()}
            </span>
          </div>
        </div>

        {/* Desktop View: Current Section Title & Academic Breadcrumb */}
        <div className="hidden md:flex items-center gap-3 min-w-0">
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold truncate">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'tasks' && 'Task & Academic Practicals'}
            {activeTab === 'calendar' && 'Academic & Milestone Calendar'}
            {activeTab === 'hackathons' && 'Hackathons & Sprint Tracker'}
            {activeTab === 'money' && 'Student Treasury & Balances'}
            {activeTab === 'analytics' && 'Financial Analytics & Velocity'}
            {activeTab === 'profile' && 'Student Profile & Settings'}
          </h1>
          <span className="font-label-xs text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium whitespace-nowrap">
            {user.course} • {user.currentSemester}
          </span>
        </div>

        {/* Right Action Icons (Touch Friendly: min 40px touch targets) */}
        <div className="flex items-center gap-1 sm:gap-2 relative ml-auto flex-shrink-0">
          {/* Quick Action Button on Mobile */}
          <button
            onClick={() => openModal('expense')}
            className="md:hidden h-9 px-2.5 bg-primary text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            type="button"
            title="Log Expense"
          >
            <span className="material-symbols-outlined text-[17px]">add_circle</span>
            <span className="text-[11px]">Expense</span>
          </button>

          {/* Theme Toggle (Mobile & Desktop) */}
          <button
            aria-label="Toggle Theme"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            title={`Current: ${theme} mode`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'dark' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              aria-label="Notifications"
              className="w-10 h-10 relative flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px]">notifications</span>
              {totalAlerts > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown Panel (Responsive: fits all viewports) */}
            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-container mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title-sm text-title-sm text-on-surface font-bold">Alerts</span>
                    {totalAlerts > 0 && (
                      <span className="font-label-xs text-label-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold">
                        {totalAlerts}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-6 h-6 rounded-md text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {urgentItems.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setActiveTab('tasks');
                        setShowNotifications(false);
                      }}
                      className="p-2.5 rounded-xl bg-error-container/20 border border-error-container/40 flex items-start gap-2.5 cursor-pointer hover:bg-error-container/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-error text-[18px] mt-0.5 flex-shrink-0">
                        priority_high
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-label-xs text-error font-bold uppercase block">
                          Urgent Task
                        </span>
                        <p className="font-body-sm text-on-surface font-semibold truncate">
                          {task.name}
                        </p>
                        <span className="font-label-xs text-on-surface-variant block mt-0.5">
                          {task.category} • Due Soon
                        </span>
                      </div>
                    </div>
                  ))}

                  {dueSoonDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      onClick={() => {
                        setActiveTab('calendar');
                        setShowNotifications(false);
                      }}
                      className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-2.5 cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">
                        event_upcoming
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-label-xs text-primary font-bold uppercase block">
                          {dl.category}
                        </span>
                        <p className="font-body-sm text-on-surface font-semibold truncate">
                          {dl.title}
                        </p>
                        <span className="font-label-xs text-on-surface-variant block mt-0.5 truncate">
                          {dl.description}
                        </span>
                      </div>
                    </div>
                  ))}

                  {totalAlerts === 0 && (
                    <div className="py-6 text-center text-on-surface-variant text-body-sm">
                      <span className="material-symbols-outlined text-3xl mb-1 text-primary">
                        done_all
                      </span>
                      <p>All caught up! No urgent alerts.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <button
            aria-label="User Profile"
            className="w-10 h-10 flex items-center justify-center p-0.5 rounded-xl hover:bg-surface-container-high transition-colors"
            onClick={() => setActiveTab('profile')}
            type="button"
            title={`${user.fullName} (${user.college})`}
          >
            <img
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40"
              src={user.avatarUrl}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
