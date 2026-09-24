import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Task } from '../types';

export const DashboardView: React.FC = () => {
  const {
    theme,
    setTheme,
    user,
    tasks,
    deadlines,
    hackathons,
    transactions,
    availableMoney,
    balances,
    monthExpenses,
    cardSpending,
    toggleTaskStatus,
    deleteTask,
    setActiveTab,
    openModal,
  } = useApp();

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Dashboard Metrics Calculations
  // Today's tasks (due today)
  const todayTasks = tasks.filter((t) => t.deadline && t.deadline.split('T')[0] === todayStr);
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Completed').length;

  // Overdue tasks (past deadline and not completed)
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completed') return false;
    return new Date(t.deadline).getTime() < now.getTime();
  });
  const overdueCount = overdueTasks.length;

  // Priority tasks for today only (non-completed prioritized first, max 4)
  const priorityTasks = tasks
    .filter((t) => t.deadline && t.deadline.split('T')[0] === todayStr)
    .sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const pMap = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return pMap[a.priority] - pMap[b.priority];
    })
    .slice(0, 4);

  // Upcoming Deadlines (dueDate >= now or status !== 'Completed')
  const upcomingDeadlines = deadlines.filter((d) => {
    return new Date(d.dueDate).getTime() >= now.getTime() - 86400000;
  });
  const dueSoonCount = upcomingDeadlines.length;

  // Upcoming / active hackathons
  const activeHackathons = hackathons.filter((h) => h.status !== 'Completed');
  const topHackathon = activeHackathons[0] || hackathons[0];

  // Recent transactions (top 4)
  const recentTransactions = transactions.slice(0, 4);

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const renderTaskTime = (t: Task) => {
    try {
      const d = new Date(t.deadline);
      const isToday = new Date().toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return isToday ? `${timeStr} today` : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Today';
    }
  };

  const formatDeadlineDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const monthAbbr = d.toLocaleDateString([], { month: 'short' }).toUpperCase();
      const dayNum = d.getDate().toString();
      return { topText: monthAbbr, btmText: dayNum };
    } catch {
      return { topText: 'DUE', btmText: 'SOON' };
    }
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* 1. Greeting Bar with Integrated System/Dark/Light Switcher */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight font-bold truncate">
            Good morning, {user.fullName.split(' ')[0]}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
            Here's your student command center overview for today.
          </p>
        </div>

        <div aria-label="Theme selector" className="flex items-center bg-surface-container-high rounded-full p-1 shadow-xs flex-shrink-0 border border-surface-container" role="group">
          <button aria-label="Light mode" className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all ${theme === 'light' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setTheme('light')} type="button" title="Light Mode"><span className="material-symbols-outlined text-[16px] sm:text-[18px]">light_mode</span></button>
          <button aria-label="Dark mode" className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all ${theme === 'dark' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setTheme('dark')} type="button" title="Dark Mode"><span className="material-symbols-outlined text-[16px] sm:text-[18px]">dark_mode</span></button>
          <button aria-label="System mode" className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all ${theme === 'system' ? 'bg-surface-container-lowest text-primary shadow-xs font-bold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setTheme('system')} type="button" title="System Mode"><span className="material-symbols-outlined text-[16px] sm:text-[18px]">desktop_windows</span></button>
        </div>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div onClick={() => setActiveTab('tasks')} className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2"><span className="w-8 h-8 rounded-xl bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-105 transition-transform"><span className="material-symbols-outlined text-[19px]">checklist</span></span>{overdueCount > 0 ? <span className="font-label-xs text-[10px] bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-bold">{overdueCount} Overdue</span> : todayTasks.length > 0 ? <span className="font-label-xs text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{todayTasks.length} Today</span> : null}</div>
          <div><span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">Tasks</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none">{pendingTasksCount}</span><span className="text-xs text-on-surface-variant">pending</span></div></div>
        </div>

        <div onClick={() => setActiveTab('calendar')} className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2"><span className="w-8 h-8 rounded-xl bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-105 transition-transform"><span className="material-symbols-outlined text-[19px]">alarm</span></span><span className="font-label-xs text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">Due soon</span></div>
          <div><span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">Deadlines</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none">{dueSoonCount}</span><span className="text-xs text-on-surface-variant truncate">Active targets</span></div></div>
        </div>

        <div onClick={() => setActiveTab('hackathons')} className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2"><span className="w-8 h-8 rounded-xl bg-secondary-fixed text-primary flex items-center justify-center group-hover:scale-105 transition-transform"><span className="material-symbols-outlined text-[19px]">terminal</span></span><span className="font-label-xs text-[10px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-full font-bold truncate max-w-[85px]">{topHackathon ? topHackathon.name.slice(0, 10) : 'Active'}</span></div>
          <div><span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">Hackathons</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-base sm:text-lg text-on-surface font-bold truncate">{topHackathon ? topHackathon.currentStage : `${activeHackathons.length} Tracked`}</span></div></div>
        </div>

        <div onClick={() => setActiveTab('money')} className="bg-surface-container-lowest rounded-2xl p-3 sm:p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2"><span className="w-8 h-8 rounded-xl bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-105 transition-transform"><span className="material-symbols-outlined text-[19px]">currency_rupee</span></span><span className="font-label-xs text-[10px] bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-bold">Liquid</span></div>
          <div><span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">Available</span><div className="flex items-baseline gap-1 mt-0.5"><span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none truncate">{formatRupee(availableMoney)}</span></div></div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container flex flex-col gap-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2.5"><div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('money')}><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[22px]">account_balance_wallet</span></div><div><span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wider font-bold">Treasury Overview (Available Liquid)</span><span className="font-headline-md text-xl sm:text-2xl text-on-surface font-extrabold leading-tight">{formatRupee(availableMoney)}</span></div></div><div className="flex gap-2 flex-wrap"><button onClick={() => openModal('balance')} className="font-label-xs text-xs px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors border border-surface-container" title="Click to calibrate UPI balance"><span className="w-2 h-2 rounded-full bg-primary" /> UPI: {formatRupee(balances.upiBalance)}</button><button onClick={() => openModal('balance')} className="font-label-xs text-xs px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors border border-surface-container" title="Click to calibrate physical cash in wallet"><span className="w-2 h-2 rounded-full bg-secondary" /> Cash: {formatRupee(balances.cashBalance)}</button></div></div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-surface-container-low p-3 rounded-xl border border-surface-container"><div className="flex flex-col"><span className="font-label-xs text-xs text-on-surface-variant flex items-center gap-1 font-medium"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Month's Expenses</span><span className="font-title-sm text-base sm:text-lg text-on-surface font-bold mt-0.5">{formatRupee(monthExpenses)}</span><span className="text-[11px] text-on-surface-variant opacity-85">Includes all category expenses</span></div><div className="flex flex-col"><span className="font-label-xs text-xs text-on-surface-variant flex items-center gap-1 font-medium"><span className="material-symbols-outlined text-[14px]">credit_card</span> Card Spending</span><span className="font-title-sm text-base sm:text-lg text-on-surface font-bold mt-0.5">{formatRupee(cardSpending)}</span><span className="text-[11px] text-secondary font-semibold">Billed separately • No liquid debit</span></div></div>
        <div className="grid grid-cols-3 gap-2 pt-1"><button className="h-10 px-2 bg-primary text-on-primary rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 hover:bg-primary-container transition-all" onClick={() => openModal('expense')} type="button"><span className="material-symbols-outlined text-[18px]">add_circle</span><span>Log Expense</span></button><button className="h-10 px-2 bg-surface-container-high text-on-surface rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all" onClick={() => openModal('income')} type="button"><span className="material-symbols-outlined text-[18px]">savings</span><span>Add Money</span></button><button className="h-10 px-2 bg-surface-container-high text-on-surface rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all" onClick={() => openModal('transfer')} type="button"><span className="material-symbols-outlined text-[18px]">sync_alt</span><span>Transfer</span></button></div>
      </section>

      <section className="flex flex-col gap-2.5"><div className="flex items-center justify-between px-0.5"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[22px]">task_alt</span><h2 className="font-title-sm text-base text-on-surface font-bold">Priority Tasks</h2></div><div className="flex items-center gap-2"><button onClick={() => openModal('task')} className="font-label-xs text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold hover:bg-primary/20 transition-colors">+ New</button><button onClick={() => setActiveTab('tasks')} className="font-label-xs text-xs text-primary font-bold hover:underline">View All ({tasks.length})</button></div></div>
        {priorityTasks.length === 0 ? <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container text-center flex flex-col items-center justify-center gap-2"><span className="material-symbols-outlined text-on-surface-variant text-[32px]">task_alt</span><p className="text-sm font-semibold text-on-surface">No priority tasks right now</p><button onClick={() => openModal('task')} className="text-xs text-primary font-bold hover:underline mt-1">+ Create your first task</button></div> : <div className="flex flex-col gap-2">{priorityTasks.map((task) => { const isCompleted = task.status === 'Completed'; return <div key={task.id} className={`bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-surface-container flex items-start gap-3 transition-all ${isCompleted ? 'opacity-65' : ''}`}><button aria-label="Mark task done" className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isCompleted ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-transparent hover:text-primary'}`} onClick={() => toggleTaskStatus(task.id)} type="button"><span className="material-symbols-outlined text-[18px]">check</span></button><div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold ${task.priority === 'Urgent' ? 'bg-error-container text-on-error-container' : task.priority === 'High' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-fixed text-on-secondary-fixed-variant'}`}>{task.priority}</span><span className="font-label-xs text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-medium">{task.category}</span><span className="font-label-xs text-[11px] text-on-surface-variant font-medium ml-auto flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">schedule</span>{renderTaskTime(task)}</span></div><p className={`font-body-md text-sm sm:text-base text-on-surface font-semibold mt-1 truncate ${isCompleted ? 'line-through text-on-surface-variant' : ''}`}>{task.name}</p>{task.description && <span className="font-body-sm text-xs text-on-surface-variant block mt-0.5 truncate">{task.description}</span>}</div><div className="flex items-center gap-1 flex-shrink-0"><button aria-label="Delete task" className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors" onClick={() => setTaskToDelete(task.id)} type="button"><span className="material-symbols-outlined text-[18px]">delete</span></button></div></div>; })}</div>}
      </section>

      {topHackathon && <div onClick={() => setActiveTab('hackathons')} className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-3.5 sm:p-4 shadow-sm border border-surface-container flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary/40 transition-all group">{topHackathon.bannerImage ? <img className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 ring-1 ring-surface-container group-hover:scale-105 transition-transform" alt="Hackathon banner" src={topHackathon.bannerImage} /> : <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center flex-shrink-0 font-bold"><span className="material-symbols-outlined text-[24px]">terminal</span></div>}<div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="font-label-xs text-xs text-primary font-bold uppercase">{topHackathon.name}</span><span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /></div><h3 className="font-title-sm text-sm sm:text-base text-on-surface font-bold truncate mt-0.5">{topHackathon.trackName || topHackathon.currentStage}</h3><p className="font-body-sm text-xs sm:text-sm text-on-surface-variant truncate">{topHackathon.deliverable || `${topHackathon.milestones.length} Milestones scheduled`}</p></div><span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block flex-shrink-0">chevron_right</span></div>}

      <section className="flex flex-col gap-2.5"><div className="flex items-center justify-between px-0.5"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[22px]">event_upcoming</span><h2 className="font-title-sm text-base text-on-surface font-bold">Upcoming Deadlines</h2></div><div className="flex items-center gap-2"><button onClick={() => openModal('deadline')} className="font-label-xs text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold hover:bg-primary/20">+ Add</button><span onClick={() => setActiveTab('calendar')} className="font-label-xs text-xs text-on-surface-variant cursor-pointer hover:text-primary font-medium">Next 7 Days →</span></div></div>{deadlines.length === 0 ? <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container text-center flex flex-col items-center justify-center gap-2"><span className="material-symbols-outlined text-on-surface-variant text-[32px]">event_available</span><p className="text-sm font-semibold text-on-surface">No deadlines pending</p><button onClick={() => openModal('deadline')} className="text-xs text-primary font-bold hover:underline">+ Add your next assignment or exam</button></div> : <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-surface-container flex flex-col gap-3">{deadlines.slice(0, 3).map((dl) => { const { topText, btmText } = formatDeadlineDate(dl.dueDate); return <div key={dl.id} className="flex items-center justify-between gap-3 pb-2.5 border-b border-surface-container last:border-b-0 last:pb-0"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex flex-col items-center justify-center flex-shrink-0 font-bold"><span className="text-[10px] leading-none">{topText}</span><span className="text-xs leading-none mt-1">{btmText}</span></div><div className="truncate"><span className="font-title-sm text-sm sm:text-base text-on-surface font-semibold block truncate">{dl.title}</span><span className="font-body-sm text-xs text-on-surface-variant block truncate">{dl.description || 'Academic Target'}</span></div></div><span className={`font-label-xs text-[10px] px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${dl.category === 'Exam' ? 'bg-error-container text-on-error-container' : dl.category === 'Project' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'}`}>{dl.category}</span></div>; })}</div>}</section>

      <section className="flex flex-col gap-2.5"><div className="flex items-center justify-between px-0.5"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span><h2 className="font-title-sm text-base text-on-surface font-bold">Recent Financial Activity</h2></div><button onClick={() => setActiveTab('money')} className="font-label-xs text-xs text-primary font-bold hover:underline">Full Ledger →</button></div>{recentTransactions.length === 0 ? <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container text-center flex flex-col items-center justify-center gap-2"><span className="material-symbols-outlined text-on-surface-variant text-[32px]">receipt</span><p className="text-sm font-semibold text-on-surface">No transactions logged yet</p><button onClick={() => openModal('expense')} className="text-xs text-primary font-bold hover:underline">+ Log an expense or calibrate balances</button></div> : <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-sm border border-surface-container flex flex-col gap-3">{recentTransactions.map((tx) => { let icon = 'receipt'; if (tx.category === 'Food') icon = 'restaurant'; else if (tx.category === 'Travel') icon = 'directions_bus'; else if (tx.category === 'Study Material') icon = 'menu_book'; else if (tx.category === 'Software') icon = 'code'; else if (tx.type === 'income') icon = 'savings'; else if (tx.type === 'transfer') icon = 'sync_alt'; const isIncome = tx.type === 'income'; const isZero = tx.amount === 0; return <div key={tx.id} className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[19px]">{icon}</span></div><div className="truncate"><span className="font-body-md text-sm sm:text-base text-on-surface font-semibold block truncate">{tx.description}</span><span className="font-label-xs text-xs text-on-surface-variant block truncate">{tx.category} • {tx.paymentSource || tx.destination || 'Transfer'} • {tx.time || tx.date}</span></div></div><div className="text-right flex-shrink-0"><span className={`font-title-sm text-sm sm:text-base font-bold block ${isZero ? 'text-primary' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface'}`}>{isZero ? '₹0' : `${isIncome ? '+' : '-'}${formatRupee(tx.amount)}`}</span><span className={`font-label-xs text-[10px] ${isZero ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{tx.status}</span></div></div>; })}</div>}</section>

      <DeleteConfirmModal isOpen={taskToDelete !== null} title="Delete Priority Task?" message="Are you sure you want to remove this task? This action cannot be undone." onCancel={() => setTaskToDelete(null)} onConfirm={() => { if (taskToDelete) { deleteTask(taskToDelete); setTaskToDelete(null); } }} />
    </div>
  );
};
