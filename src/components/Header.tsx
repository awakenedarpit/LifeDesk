import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';
import { GlobalSearchBar } from './GlobalSearchBar';

export const Header: React.FC = () => {
  const { theme, setTheme, activeTab, setActiveTab, user, deadlines, tasks, openModal } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const urgentItems = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed');
  const dueSoonDeadlines = deadlines.filter((d) => d.status === 'Due Soon' || d.status === 'Upcoming');
  const totalAlerts = urgentItems.length + dueSoonDeadlines.length;

  return (
    <header className="fixed md:sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant shadow-[0_1px_8px_rgba(23,60,48,0.04)]">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile: Official Reference Logo (Desktop logo is in Sidebar) */}
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer select-none md:hidden min-w-0 focus:outline-none"
          onClick={() => setActiveTab('dashboard')}
          aria-label="LifeDesk Home"
        >
          <BrandLogo variant="full" className="h-7 w-auto" />
        </button>

        {/* Desktop View: Current Section Title & Academic Breadcrumb */}
        <div className="hidden md:flex items-center gap-3 min-w-0 flex-shrink">
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold truncate">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'tasks' && 'Task & Academic Practicals'}
            {activeTab === 'calendar' && 'Academic & Milestone Calendar'}
            {activeTab === 'hackathons' && 'Hackathons & Sprint Tracker'}
            {activeTab === 'learning' && 'Things to Learn'}
            {activeTab === 'money' && 'Student Treasury & Balances'}
            {activeTab === 'analytics' && 'Financial Analytics & Velocity'}
            {(activeTab === 'profile' || activeTab === 'settings') && 'Student Profile & Settings'}
          </h1>
          {user.course && (
            <span className="hidden xl:inline-flex font-label-xs text-[11px] px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface-variant font-semibold whitespace-nowrap truncate max-w-[240px]">
              {user.course}{user.currentSemester ? ` • ${user.currentSemester}` : ''}
            </span>
          )}
        </div>

        {/* Desktop Global Search Bar */}
        <div className="hidden md:block flex-1 max-w-sm lg:max-w-md mx-2">
          <GlobalSearchBar variant="desktop" />
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2 relative ml-auto md:ml-0 flex-shrink-0">
          {/* Quick Action Button on Mobile */}
          <button
            onClick={() => openModal('expense')}
            className="md:hidden h-9 px-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all whitespace-nowrap"
            type="button"
            title="Log Expense"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span className="text-[11px]">Expense</span>
          </button>

          {/* Mobile Search Toggle */}
          <button
            aria-label={showMobileSearch ? 'Close search' : 'Open search'}
            aria-expanded={showMobileSearch}
            className={`md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
              showMobileSearch
                ? 'bg-surface-container text-primary-ink'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
            onClick={() => {
              setShowMobileSearch((prev) => !prev);
              setShowNotifications(false);
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showMobileSearch ? 'close' : 'search'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            aria-label="Toggle Theme"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
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
              className="w-9 h-9 sm:w-10 sm:h-10 relative flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMobileSearch(false);
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-[21px]">notifications</span>
              {totalAlerts > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-error ring-2 ring-surface-container-lowest" />
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title-sm text-title-sm text-on-surface font-bold">Alerts</span>
                    {totalAlerts > 0 && (
                      <span className="font-label-xs text-label-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-md font-bold">
                        {totalAlerts}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
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
                      className="p-2.5 rounded-xl bg-error-container/50 border border-error/25 flex items-start gap-2.5 cursor-pointer hover:bg-error-container/70 transition-colors"
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
                      className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant flex items-start gap-2.5 cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-primary-ink text-[18px] mt-0.5 flex-shrink-0">
                        event_upcoming
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-label-xs text-primary-ink font-bold uppercase block">
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
                      <span className="material-symbols-outlined text-3xl mb-1 text-primary-ink">
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
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center p-0.5 rounded-xl hover:bg-surface-container-low transition-colors"
            onClick={() => setActiveTab('profile')}
            type="button"
            title={`${user.fullName}${user.college ? ` (${user.college})` : ''}`}
          >
            <UserAvatar
              src={user.avatarUrl}
              name={user.fullName}
              className="w-8 h-8 rounded-full ring-2 ring-primary/40"
            />
          </button>
        </div>
      </div>

      {/* Mobile Expandable Search Drawer */}
      {showMobileSearch && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest px-3 py-2.5 animate-in fade-in duration-150">
          <GlobalSearchBar
            variant="mobile"
            autoFocus
            onCloseMobile={() => setShowMobileSearch(false)}
          />
        </div>
      )}
    </header>
  );
};
