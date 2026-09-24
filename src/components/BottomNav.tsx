import React from 'react';
import { useApp } from '../context/AppContext';
import { AppNavTab } from '../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, tasks, deadlines } = useApp();
  const urgentCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const dueSoonCount = deadlines.filter((d) => d.status === 'Due Soon' || d.status === 'Upcoming').length;
  const navItems: { id: AppNavTab; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Board', icon: 'grid_view' },
    { id: 'tasks', label: 'Tasks', icon: 'check_box', badge: urgentCount > 0 ? urgentCount : undefined },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month', badge: dueSoonCount > 0 ? dueSoonCount : undefined },
    { id: 'learning', label: 'Learn', icon: 'auto_stories' },
    { id: 'money', label: 'Finances', icon: 'account_balance_wallet' },
  ];
  return <nav className="md:hidden fixed bottom-0 w-full z-40 pb-safe bg-surface/95 backdrop-blur-xl border-t border-surface-container shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"><div className="flex justify-around items-center h-16 px-1">{navItems.map(item => { const isActive = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex flex-col items-center justify-center h-full py-1 transition-all group relative select-none touch-manipulation min-w-[56px] ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`} type="button"><div className="relative flex items-center justify-center"><span className={`material-symbols-outlined text-[22px] ${isActive ? 'scale-110 font-bold' : ''}`}>{item.icon}</span>{item.badge !== undefined && <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-xs text-[9px] font-bold flex items-center justify-center">{item.badge}</span>}</div><span className={`font-label-xs text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>{isActive && <span className="absolute top-0 w-8 h-1 rounded-b-full bg-primary"/>}</button>; })}</div></nav>;
};