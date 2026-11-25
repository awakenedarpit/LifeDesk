import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { HackathonBanner } from '../components/HackathonBanner';
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

  const todayTasks = tasks.filter((t) => t.deadline && t.deadline.split('T')[0] === todayStr);
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Completed').length;

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Completed') return false;
    return new Date(t.deadline).getTime() < now.getTime();
  });
  const overdueCount = overdueTasks.length;

  const priorityTasks = tasks
    .filter((t) => t.deadline && t.deadline.split('T')[0] === todayStr)
    .sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const pMap = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return pMap[a.priority] - pMap[b.priority];
    })
    .slice(0, 4);

  const upcomingDeadlines = deadlines.filter((d) => {
    return new Date(d.dueDate).getTime() >= now.getTime() - 86400000;
  });
  const dueSoonCount = upcomingDeadlines.length;

  const activeHackathons = hackathons.filter((h) => h.status !== 'Completed');
  const topHackathon = activeHackathons[0] || hackathons[0];

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
    <div className="flex flex-col w-full gap-3.5 sm:gap-4 lg:gap-5">
      {/* 1. Greeting Bar with Integrated System/Dark/Light Switcher */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight font-bold truncate">
            Welcome back, {user.fullName.split(' ')[0]}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
            Here is your student command center overview for today.
          </p>
        </div>

        <div
          aria-label="Theme selector"
          className="flex items-center bg-surface-container-lowest rounded-xl p-1 shadow-xs flex-shrink-0 border border-outline-variant"
          role="group"
        >
          <button
            aria-label="Light mode"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              theme === 'light'
                ? 'bg-surface-container text-primary-ink shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setTheme('light')}
            type="button"
            title="Light Mode"
          >
            <span className="material-symbols-outlined text-[17px]">light_mode</span>
          </button>
          <button
            aria-label="Dark mode"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              theme === 'dark'
                ? 'bg-surface-container text-primary-ink shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setTheme('dark')}
            type="button"
            title="Dark Mode"
          >
            <span className="material-symbols-outlined text-[17px]">dark_mode</span>
          </button>
          <button
            aria-label="System mode"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
              theme === 'system'
                ? 'bg-surface-container text-primary-ink shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setTheme('system')}
            type="button"
            title="System Mode"
          >
            <span className="material-symbols-outlined text-[17px]">desktop_windows</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col justify-between cursor-pointer hover:border-primary-deep transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[19px]">checklist</span>
            </span>
            {overdueCount > 0 ? (
              <span className="font-label-xs text-[10px] bg-error-container text-on-error-container px-2 py-0.5 rounded-md font-bold">
                {overdueCount} Overdue
              </span>
            ) : todayTasks.length > 0 ? (
              <span className="font-label-xs text-[10px] bg-surface-container text-primary-ink px-2 py-0.5 rounded-md font-bold">
                {todayTasks.length} Today
              </span>
            ) : null}
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">
              Tasks
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none tabular-nums">
                {pendingTasksCount}
              </span>
              <span className="text-xs text-on-surface-variant">pending</span>
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('calendar')}
          className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col justify-between cursor-pointer hover:border-primary-deep transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[19px]">alarm</span>
            </span>
            <span className="font-label-xs text-[10px] bg-surface-container-low border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded-md font-bold">
              Due soon
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">
              Deadlines
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none tabular-nums">
                {dueSoonCount}
              </span>
              <span className="text-xs text-on-surface-variant truncate">Active targets</span>
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('hackathons')}
          className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col justify-between cursor-pointer hover:border-primary-deep transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[19px]">terminal</span>
            </span>
            <span className="font-label-xs text-[10px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-md font-bold truncate max-w-[90px]">
              {topHackathon ? topHackathon.name.slice(0, 12) : 'Active'}
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">
              Hackathons
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg text-on-surface font-bold truncate">
                {topHackathon ? topHackathon.currentStage : `${activeHackathons.length} Tracked`}
              </span>
            </div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('money')}
          className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col justify-between cursor-pointer hover:border-primary-deep transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[19px]">currency_rupee</span>
            </span>
            <span className="font-label-xs text-[10px] bg-surface-container text-primary-ink px-2 py-0.5 rounded-md font-bold">
              Liquid
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wide font-bold">
              Available
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl text-on-surface font-extrabold leading-none truncate tabular-nums">
                {formatRupee(availableMoney)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Treasury Overview */}
      <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-outline-variant flex flex-col gap-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('money')}>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <div>
              <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase tracking-wider font-bold">
                Treasury Overview (Available Liquid)
              </span>
              <span className="font-currency-stat text-xl sm:text-2xl text-on-surface font-extrabold leading-tight">
                {formatRupee(availableMoney)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openModal('balance')}
              className="font-label-xs text-xs px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors border border-outline-variant tabular-nums"
              title="Click to calibrate UPI balance"
            >
              <span className="w-2 h-2 rounded-full bg-primary-deep" />
              UPI: {formatRupee(balances.upiBalance)}
            </button>
            <button
              type="button"
              onClick={() => openModal('balance')}
              className="font-label-xs text-xs px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors border border-outline-variant tabular-nums"
              title="Click to calibrate physical cash in wallet"
            >
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              Cash: {formatRupee(balances.cashBalance)}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
          <div className="flex flex-col">
            <span className="font-label-xs text-xs text-on-surface-variant flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span> Month's Expenses
            </span>
            <span className="font-title-sm text-base sm:text-lg text-on-surface font-bold mt-0.5 tabular-nums">
              {formatRupee(monthExpenses)}
            </span>
            <span className="text-[11px] text-on-surface-variant">Includes all category expenses</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-xs text-xs text-on-surface-variant flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">credit_card</span> Card Spending
            </span>
            <span className="font-title-sm text-base sm:text-lg text-on-surface font-bold mt-0.5 tabular-nums">
              {formatRupee(cardSpending)}
            </span>
            <span className="text-[11px] text-primary-ink font-semibold">Billed separately • No liquid debit</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            className="h-10 px-2 bg-primary text-on-primary rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 hover:bg-primary-container hover:text-on-primary-container transition-all"
            onClick={() => openModal('expense')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Log Expense</span>
          </button>
          <button
            className="h-10 px-2 bg-surface-container-low border border-outline-variant text-on-surface rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
            onClick={() => openModal('income')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">savings</span>
            <span>Add Money</span>
          </button>
          <button
            className="h-10 px-2 bg-surface-container-low border border-outline-variant text-on-surface rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
            onClick={() => openModal('transfer')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Transfer</span>
          </button>
        </div>
      </section>

      {/* 4. Priority Tasks */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-ink text-[22px]">task_alt</span>
            <h2 className="font-title-sm text-base text-on-surface font-bold">Priority Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal('task')}
              className="font-label-xs text-xs bg-surface-container text-primary-ink px-2.5 py-1 rounded-lg font-bold hover:bg-surface-container-high transition-colors"
            >
              + New
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="font-label-xs text-xs text-primary-ink font-bold hover:underline"
            >
              View All ({tasks.length})
            </button>
          </div>
        </div>

        {priorityTasks.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">task_alt</span>
            <p className="text-sm font-semibold text-on-surface">No priority tasks right now</p>
            <button
              type="button"
              onClick={() => openModal('task')}
              className="text-xs text-primary-ink font-bold hover:underline mt-1"
            >
              + Create your first task
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {priorityTasks.map((task) => {
              const isCompleted = task.status === 'Completed';
              return (
                <div
                  key={task.id}
                  className={`bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex items-start gap-3 transition-all ${
                    isCompleted ? 'opacity-65' : ''
                  }`}
                >
                  <button
                    aria-label="Mark task done"
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border ${
                      isCompleted
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low border-outline-variant text-transparent hover:text-primary-ink'
                    }`}
                    onClick={() => toggleTaskStatus(task.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-label-xs text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          task.priority === 'Urgent'
                            ? 'bg-error-container text-on-error-container'
                            : task.priority === 'High'
                            ? 'bg-surface-container text-primary-ink'
                            : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="font-label-xs text-[10px] bg-surface-container-low border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded-md font-medium">
                        {task.category}
                      </span>
                      <span className="font-label-xs text-[11px] text-on-surface-variant font-medium ml-auto flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {renderTaskTime(task)}
                      </span>
                    </div>
                    <p
                      className={`font-body-md text-sm sm:text-base text-on-surface font-semibold mt-1 truncate ${
                        isCompleted ? 'line-through text-on-surface-variant' : ''
                      }`}
                    >
                      {task.name}
                    </p>
                    {task.description && (
                      <span className="font-body-sm text-xs text-on-surface-variant block mt-0.5 truncate">
                        {task.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      aria-label="Delete task"
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors"
                      onClick={() => setTaskToDelete(task.id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Active Hackathon Highlight */}
      {topHackathon && (
        <div
          onClick={() => setActiveTab('hackathons')}
          className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-3.5 sm:p-4 shadow-xs border border-outline-variant flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary-deep transition-all group"
        >
          <HackathonBanner
            src={topHackathon.bannerImage}
            alt={topHackathon.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-label-xs text-xs text-primary-ink font-bold uppercase">
                {topHackathon.name}
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-deep" />
            </div>
            <h3 className="font-title-sm text-sm sm:text-base text-on-surface font-bold truncate mt-0.5">
              {topHackathon.trackName || topHackathon.currentStage}
            </h3>
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant truncate">
              {topHackathon.deliverable || `${topHackathon.milestones.length} Milestones scheduled`}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block flex-shrink-0">
            chevron_right
          </span>
        </div>
      )}

      {/* 6. Upcoming Deadlines */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-ink text-[22px]">event_upcoming</span>
            <h2 className="font-title-sm text-base text-on-surface font-bold">Upcoming Deadlines</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal('deadline')}
              className="font-label-xs text-xs bg-surface-container text-primary-ink px-2.5 py-1 rounded-lg font-bold hover:bg-surface-container-high"
            >
              + Add
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="font-label-xs text-xs text-on-surface-variant hover:text-primary-ink font-medium"
            >
              Next 7 Days →
            </button>
          </div>
        </div>

        {deadlines.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">event_available</span>
            <p className="text-sm font-semibold text-on-surface">No deadlines pending</p>
            <button
              type="button"
              onClick={() => openModal('deadline')}
              className="text-xs text-primary-ink font-bold hover:underline"
            >
              + Add your next assignment or exam
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col gap-3">
            {deadlines.slice(0, 3).map((dl) => {
              const { topText, btmText } = formatDeadlineDate(dl.dueDate);
              return (
                <div
                  key={dl.id}
                  className="flex items-center justify-between gap-3 pb-2.5 border-b border-outline-variant/60 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-surface-container text-primary-ink flex flex-col items-center justify-center flex-shrink-0 font-bold">
                      <span className="text-[10px] leading-none">{topText}</span>
                      <span className="text-xs leading-none mt-1 tabular-nums">{btmText}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-title-sm text-sm sm:text-base text-on-surface font-semibold block truncate">
                        {dl.title}
                      </span>
                      <span className="font-body-sm text-xs text-on-surface-variant block truncate">
                        {dl.description || 'Academic Target'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`font-label-xs text-[10px] px-2.5 py-1 rounded-md font-bold flex-shrink-0 ${
                      dl.category === 'Exam'
                        ? 'bg-error-container text-on-error-container'
                        : dl.category === 'Project'
                        ? 'bg-surface-container text-primary-ink'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                    }`}
                  >
                    {dl.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Recent Financial Activity */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-ink text-[22px]">receipt_long</span>
            <h2 className="font-title-sm text-base text-on-surface font-bold">Recent Financial Activity</h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('money')}
            className="font-label-xs text-xs text-primary-ink font-bold hover:underline"
          >
            Full Ledger →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">receipt</span>
            <p className="text-sm font-semibold text-on-surface">No transactions logged yet</p>
            <button
              type="button"
              onClick={() => openModal('expense')}
              className="text-xs text-primary-ink font-bold hover:underline"
            >
              + Log an expense or calibrate balances
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant flex flex-col gap-3">
            {recentTransactions.map((tx) => {
              let icon = 'receipt';
              if (tx.category === 'Food') icon = 'restaurant';
              else if (tx.category === 'Travel') icon = 'directions_bus';
              else if (tx.category === 'Study Material') icon = 'menu_book';
              else if (tx.category === 'Software') icon = 'code';
              else if (tx.type === 'income') icon = 'savings';
              else if (tx.type === 'transfer') icon = 'sync_alt';
              const isIncome = tx.type === 'income';
              const isZero = tx.amount === 0;
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[19px]">{icon}</span>
                    </div>
                    <div className="truncate">
                      <span className="font-body-md text-sm sm:text-base text-on-surface font-semibold block truncate">
                        {tx.description}
                      </span>
                      <span className="font-label-xs text-xs text-on-surface-variant block truncate">
                        {tx.category} • {tx.paymentSource || tx.destination || 'Transfer'} • {tx.time || tx.date}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`font-title-sm text-sm sm:text-base font-bold block tabular-nums ${
                        isZero ? 'text-primary-ink' : isIncome ? 'text-primary-ink' : 'text-on-surface'
                      }`}
                    >
                      {isZero ? '₹0' : `${isIncome ? '+' : '-'}${formatRupee(tx.amount)}`}
                    </span>
                    <span
                      className={`font-label-xs text-[10px] ${
                        isZero ? 'text-primary-ink font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <DeleteConfirmModal
        isOpen={taskToDelete !== null}
        title="Delete Priority Task?"
        message="Are you sure you want to remove this task? This action cannot be undone."
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete);
            setTaskToDelete(null);
          }
        }}
      />
    </div>
  );
};
