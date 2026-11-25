import React from 'react';
import { useApp } from '../context/AppContext';
import { AppNavTab } from '../types';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, user, availableMoney, balances, tasks, deadlines, theme, setTheme, openModal } = useApp();
  const urgentTasksCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const dueSoonCount = deadlines.filter((d) => d.status === 'Due Soon' || d.status === 'Upcoming').length;

  const navItems: { id: AppNavTab; label: string; icon: string; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'tasks', label: 'Tasks & Practicals', icon: 'check_box', badge: urgentTasksCount > 0 ? `${urgentTasksCount} Urgent` : undefined, badgeColor: 'bg-error-container text-on-error-container' },
    { id: 'calendar', label: 'Academic Calendar', icon: 'calendar_month', badge: dueSoonCount > 0 ? dueSoonCount : undefined, badgeColor: 'bg-surface-container text-primary-ink' },
    { id: 'hackathons', label: 'Hackathons & Sprints', icon: 'terminal' },
    { id: 'learning', label: 'Things to Learn', icon: 'auto_stories' },
    { id: 'money', label: 'Treasury & Ledger', icon: 'account_balance_wallet' },
    { id: 'analytics', label: 'Financial Analytics', icon: 'analytics' },
    { id: 'profile', label: 'Profile & Settings', icon: 'person' },
  ];

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-outline-variant z-40 select-none overflow-y-auto">
      {/* Brand Bar */}
      <div className="px-4 lg:px-5 h-16 border-b border-outline-variant flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center min-w-0 focus:outline-none"
          aria-label="LifeDesk Dashboard"
        >
          <BrandLogo variant="full" className="h-7 lg:h-8 w-auto" />
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex-shrink-0"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle color mode"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
      </div>

      {/* Quick Add Actions */}
      <div className="p-3 border-b border-outline-variant flex gap-1.5">
        <button
          onClick={() => openModal('expense')}
          className="flex-1 h-9 rounded-xl bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all whitespace-nowrap"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">add_circle</span>
          <span>Expense</span>
        </button>
        <button
          onClick={() => openModal('task')}
          className="flex-1 h-9 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-surface-container active:scale-95 transition-all whitespace-nowrap"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">add_task</span>
          <span>Task</span>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2.5 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              type="button"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[19px] ${
                    isActive ? 'text-on-primary' : 'text-on-surface-variant group-hover:text-primary-ink'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`font-label-xs text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ml-1 ${
                    isActive ? 'bg-surface-container-lowest text-on-surface' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Liquid Treasury Summary */}
      <div className="p-3 border-t border-outline-variant">
        <div
          onClick={() => openModal('balance')}
          className="p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary-deep transition-colors cursor-pointer"
          title="Click to calibrate liquid balances"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-xs text-[10px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-deep" />
              Liquid Treasury
            </span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">tune</span>
          </div>
          <div className="font-currency-stat text-[18px] text-on-surface font-extrabold leading-tight">
            {formatRupee(availableMoney)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium mt-1.5 pt-1.5 border-t border-outline-variant/60 tabular-nums">
            <span>UPI: {formatRupee(balances.upiBalance)}</span>
            <span>Cash: {formatRupee(balances.cashBalance)}</span>
          </div>
        </div>
      </div>

      {/* User Profile Link */}
      <div
        onClick={() => setActiveTab('profile')}
        className="p-3 border-t border-outline-variant flex items-center gap-2.5 cursor-pointer hover:bg-surface-container-low transition-colors"
      >
        <UserAvatar
          src={user.avatarUrl}
          name={user.fullName}
          className="w-8 h-8 rounded-full ring-2 ring-primary/40"
        />
        <div className="flex-1 min-w-0">
          <span className="font-title-sm text-xs font-bold text-on-surface block truncate">
            {user.fullName}
          </span>
          <span className="text-[10px] text-on-surface-variant block truncate">
            {user.college || user.email}
          </span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">chevron_right</span>
      </div>
    </aside>
  );
};