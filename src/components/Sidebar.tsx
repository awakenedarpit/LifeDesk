import React from 'react';
import { useApp } from '../context/AppContext';
import { AppNavTab } from '../types';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    user,
    availableMoney,
    balances,
    tasks,
    deadlines,
    theme,
    setTheme,
    openModal,
  } = useApp();

  const urgentTasksCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const dueSoonCount = deadlines.filter((d) => d.status === 'Due Soon' || d.status === 'Upcoming').length;

  const navItems: { id: AppNavTab; label: string; icon: string; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    {
      id: 'tasks',
      label: 'Tasks & Practicals',
      icon: 'check_box',
      badge: urgentTasksCount > 0 ? `${urgentTasksCount} Urgent` : undefined,
      badgeColor: 'bg-error-container text-on-error-container',
    },
    {
      id: 'calendar',
      label: 'Academic Calendar',
      icon: 'calendar_month',
      badge: dueSoonCount > 0 ? dueSoonCount : undefined,
      badgeColor: 'bg-primary-fixed text-on-primary-fixed-variant',
    },
    { id: 'hackathons', label: 'Hackathons & Sprints', icon: 'terminal' },
    { id: 'money', label: 'Treasury & Ledger', icon: 'account_balance_wallet' },
    { id: 'analytics', label: 'Financial Analytics', icon: 'analytics' },
    { id: 'profile', label: 'Profile & Settings', icon: 'person' },
  ];

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 flex-shrink-0 h-screen sticky top-0 bg-surface-container-lowest border-r border-surface-container z-40 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="p-4 lg:p-5 pb-3 border-b border-surface-container flex items-center justify-between">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface leading-tight font-bold">
              LifeDesk
            </span>
            <span className="font-label-xs text-[10px] text-primary font-semibold tracking-wider uppercase leading-none">
              Student Command
            </span>
          </div>
        </div>

        {/* Desktop Theme Toggle Pill */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
      </div>

      {/* Quick Launch Action Triggers */}
      <div className="p-3 border-b border-surface-container flex gap-1.5">
        <button
          onClick={() => openModal('expense')}
          className="flex-1 h-8 rounded-lg bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs hover:bg-primary-container active:scale-95 transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">add_circle</span>
          <span>Expense</span>
        </button>
        <button
          onClick={() => openModal('task')}
          className="flex-1 h-8 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-surface-container active:scale-95 transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[15px]">add_task</span>
          <span>Task</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              type="button"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`material-symbols-outlined text-[19px] transition-transform ${
                    isActive ? 'text-on-primary' : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ml-1 ${
                    isActive ? 'bg-surface-container-lowest text-primary' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Liquid Treasury Overview Mini-Widget in Sidebar */}
      <div className="p-3 border-t border-surface-container">
        <div
          onClick={() => openModal('balance')}
          className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container hover:border-primary/40 transition-colors cursor-pointer"
          title="Click to calibrate liquid balances"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-xs text-[10px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Liquid Treasury
            </span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
              tune
            </span>
          </div>
          <div className="font-currency-stat text-[18px] text-on-surface font-extrabold leading-tight">
            {formatRupee(availableMoney)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-medium mt-1 pt-1 border-t border-surface-container/60">
            <span>UPI: {formatRupee(balances.upiBalance)}</span>
            <span>Cash: {formatRupee(balances.cashBalance)}</span>
          </div>
        </div>
      </div>

      {/* Student Profile Quick Bar at Footer */}
      <div
        onClick={() => setActiveTab('profile')}
        className="p-3 border-t border-surface-container flex items-center gap-2.5 cursor-pointer hover:bg-surface-container transition-colors"
      >
        <img
          src={user.avatarUrl}
          alt={user.fullName}
          className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <span className="font-title-sm text-xs font-bold text-on-surface block truncate">
            {user.fullName}
          </span>
          <span className="text-[10px] text-on-surface-variant block truncate">
            {user.college}
          </span>
        </div>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          chevron_right
        </span>
      </div>
    </aside>
  );
};
