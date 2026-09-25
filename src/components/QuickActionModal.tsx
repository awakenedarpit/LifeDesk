import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, PaymentSource, IncomeDestination, TaskCategory, TaskPriority, DeadlineCategory, ParticipationType } from '../types';

export const QuickActionModal: React.FC = () => {
  const {
    activeModal,
    closeModal,
    addExpense,
    addIncome,
    addTransfer,
    setBalancesManual,
    balances,
    addTask,
    addDeadline,
  } = useApp();

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Food');
  const [expenseSource, setExpenseSource] = useState<PaymentSource>('UPI');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');

  // Income form state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeDestination, setIncomeDestination] = useState<IncomeDestination>('UPI');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeNotes, setIncomeNotes] = useState('');

  // Transfer form state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState<'UPI' | 'Cash'>('UPI');
  const [transferTo, setTransferTo] = useState<'UPI' | 'Cash'>('Cash');
  const [transferNotes, setTransferNotes] = useState('');

  // Balances adjustment state
  const [manualUpi, setManualUpi] = useState('');
  const [manualCash, setManualCash] = useState('');

  // Task form state
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('College');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskDeadline, setTaskDeadline] = useState(new Date().toISOString().slice(0, 16));
  const [taskNotes, setTaskNotes] = useState('');
  const [taskTags, setTaskTags] = useState('');
  const [taskParticipationType, setTaskParticipationType] = useState<ParticipationType>('Individual');
  const [taskTeamName, setTaskTeamName] = useState('');

  // Deadline form state
  const [deadlineTitle, setDeadlineTitle] = useState('');
  const [deadlineDesc, setDeadlineDesc] = useState('');
  const [deadlineCat, setDeadlineCat] = useState<DeadlineCategory>('Assignment');
  const [deadlineDate, setDeadlineDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16));

  useEffect(() => {
    if (activeModal === 'balance') {
      setManualUpi(balances.upiBalance.toString());
      setManualCash(balances.cashBalance.toString());
    }
  }, [activeModal, balances]);

  if (activeModal === 'none') return null;

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount) return;
    addExpense({
      amount: parseFloat(expenseAmount),
      description: expenseDesc || `${expenseCategory} Expense`,
      category: expenseCategory,
      paymentSource: expenseSource,
      date: expenseDate,
      notes: expenseNotes,
    });
    setExpenseAmount('');
    setExpenseDesc('');
    setExpenseNotes('');
    closeModal();
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount) return;
    addIncome({
      amount: parseFloat(incomeAmount),
      description: incomeDesc || 'Pocket Money',
      destination: incomeDestination,
      date: incomeDate,
      notes: incomeNotes,
    });
    setIncomeAmount('');
    setIncomeDesc('');
    setIncomeNotes('');
    closeModal();
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount) return;
    addTransfer({
      amount: parseFloat(transferAmount),
      transferFrom,
      transferTo,
      date: new Date().toISOString().split('T')[0],
      notes: transferNotes,
    });
    setTransferAmount('');
    setTransferNotes('');
    closeModal();
  };

  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBalancesManual(parseFloat(manualUpi) || 0, parseFloat(manualCash) || 0);
    closeModal();
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;
    addTask({
      name: taskName,
      description: taskDesc,
      category: taskCategory,
      priority: taskPriority,
      status: 'Not Started',
      deadline: new Date(taskDeadline).toISOString(),
      notes: taskNotes,
      tags: taskTags ? taskTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      participationType: taskParticipationType,
      teamName: taskParticipationType === 'Team' ? taskTeamName.trim() : '',
    });
    setTaskName('');
    setTaskDesc('');
    setTaskNotes('');
    setTaskTags('');
    setTaskParticipationType('Individual');
    setTaskTeamName('');
    closeModal();
  };

  const handleDeadlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineTitle) return;
    addDeadline({
      title: deadlineTitle,
      description: deadlineDesc,
      category: deadlineCat,
      dueDate: new Date(deadlineDate).toISOString(),
      status: 'Upcoming',
    });
    setDeadlineTitle('');
    setDeadlineDesc('');
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                {activeModal === 'expense' && 'add_circle'}
                {activeModal === 'income' && 'savings'}
                {activeModal === 'transfer' && 'sync_alt'}
                {activeModal === 'balance' && 'account_balance_wallet'}
                {activeModal === 'task' && 'task_alt'}
                {activeModal === 'deadline' && 'event_upcoming'}
              </span>
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
              {activeModal === 'expense' && 'Log Campus Expense'}
              {activeModal === 'income' && 'Add Pocket Money / Income'}
              {activeModal === 'transfer' && 'Transfer Balance'}
              {activeModal === 'balance' && 'Adjust Liquid Treasury'}
              {activeModal === 'task' && 'Create Priority Task'}
              {activeModal === 'deadline' && 'Add New Deadline'}
            </h3>
          </div>
          <button
            className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors"
            onClick={closeModal}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 1. EXPENSE FORM */}
        {activeModal === 'expense' && (
          <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  required
                  type="number"
                  step="any"
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full h-11 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface text-body-lg font-semibold outline-none focus:bg-surface-container-high transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Description *
              </label>
              <input
                required
                type="text"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="e.g. Canteen Lunch, Xerox prints"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Payment Source *
                </label>
                <select
                  value={expenseSource}
                  onChange={(e) => setExpenseSource(e.target.value as PaymentSource)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="UPI">UPI (Liquid)</option>
                  <option value="Cash">Cash (Liquid)</option>
                  <option value="Card">Card (Credit/Billed)</option>
                </select>
                <span className="text-[11px] text-on-surface-variant mt-0.5 block">
                  {expenseSource === 'Card' ? '• Not debited from liquid cash/UPI' : '• Debits from liquid balance'}
                </span>
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Category *
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="College">College</option>
                  <option value="Study Material">Study Material</option>
                  <option value="Software">Software</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Recharge">Recharge</option>
                  <option value="Hostel / Room">Hostel / Room</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Optional details"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">Participation</label>
      <select value={taskParticipationType} onChange={(e) => setTaskParticipationType(e.target.value as ParticipationType)} className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium">
        <option value="Individual">Individual</option>
        <option value="Team">Team</option>
      </select>
    </div>
    {taskParticipationType === 'Team' && <div>
      <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">Team Name</label>
      <input type="text" value={taskTeamName} onChange={(e) => setTaskTeamName(e.target.value)} placeholder="e.g. Neural Nexus" className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors" />
    </div>}
  </div>

  <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Confirm Expense
              </button>
            </div>
          </form>
        )}

        {/* 2. INCOME FORM */}
        {activeModal === 'income' && (
          <form onSubmit={handleIncomeSubmit} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Amount Received (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  required
                  type="number"
                  step="any"
                  min="1"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full h-11 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface text-body-lg font-semibold outline-none focus:bg-surface-container-high transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Description *
              </label>
              <input
                required
                type="text"
                value={incomeDesc}
                onChange={(e) => setIncomeDesc(e.target.value)}
                placeholder="e.g. Monthly Pocket Money, Project Stipend"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Deposit Into *
                </label>
                <select
                  value={incomeDestination}
                  onChange={(e) => setIncomeDestination(e.target.value as IncomeDestination)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="UPI">UPI Account</option>
                  <option value="Cash">Physical Cash</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Notes
              </label>
              <input
                type="text"
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
                placeholder="From parents / freelance / college grant"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <p className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg">
              ℹ️ Income increases available money and does NOT count as an expense.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Add Income
              </button>
            </div>
          </form>
        )}

        {/* 3. TRANSFER FORM */}
        {activeModal === 'transfer' && (
          <form onSubmit={handleTransferSubmit} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Transfer Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  required
                  type="number"
                  step="any"
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full h-11 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface text-body-lg font-semibold outline-none focus:bg-surface-container-high transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  From
                </label>
                <select
                  value={transferFrom}
                  onChange={(e) => {
                    const from = e.target.value as 'UPI' | 'Cash';
                    setTransferFrom(from);
                    setTransferTo(from === 'UPI' ? 'Cash' : 'UPI');
                  }}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="UPI">UPI (₹{balances.upiBalance.toLocaleString('en-IN')})</option>
                  <option value="Cash">Cash (₹{balances.cashBalance.toLocaleString('en-IN')})</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  To
                </label>
                <select
                  value={transferTo}
                  disabled
                  className="w-full h-10 px-2.5 bg-surface-container-high opacity-85 rounded-lg text-on-surface text-body-md outline-none font-medium"
                >
                  <option value={transferTo}>{transferTo}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. ATM Cash Withdrawal / Friend settled cash"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <p className="text-xs text-on-surface-variant bg-surface-container-low p-2 rounded-lg">
              ℹ️ Transfers shift funds between UPI and Cash. Total available liquid money remains unchanged and does NOT count as an expense.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Confirm Transfer
              </button>
            </div>
          </form>
        )}

        {/* 4. BALANCES MANUAL ADJUSTMENT */}
        {activeModal === 'balance' && (
          <form onSubmit={handleBalanceSubmit} className="flex flex-col gap-3">
            <p className="text-xs text-on-surface-variant">
              Manually calibrate your physical cash in wallet and digital UPI bank balance.
            </p>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Current UPI Balance (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={manualUpi}
                  onChange={(e) => setManualUpi(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface text-body-lg font-semibold outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Current Physical Cash Balance (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-lg">₹</span>
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={manualCash}
                  onChange={(e) => setManualCash(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 bg-surface-container-low rounded-lg text-on-surface text-body-lg font-semibold outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg text-sm flex justify-between items-center">
              <span className="text-on-surface-variant font-medium">New Total Available:</span>
              <span className="font-headline-md text-primary font-bold">
                ₹{((parseFloat(manualUpi) || 0) + (parseFloat(manualCash) || 0)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Save Balances
              </button>
            </div>
          </form>
        )}

        {/* 5. TASK FORM */}
        {activeModal === 'task' && (
          <form onSubmit={handleTaskSubmit} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Task Name *
              </label>
              <input
                required
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g. Submit OS Lab Practical Assignment"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Description
              </label>
              <input
                type="text"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="e.g. Page replacement algorithms & kernel tracing report"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Category *
                </label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="College">College</option>
                  <option value="Practical">Practical</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Exam">Exam</option>
                  <option value="Project">Project</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Presentation">Presentation</option>
                  <option value="Personal">Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Priority *
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-semibold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Deadline Date & Time *
              </label>
              <input
                required
                type="datetime-local"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={taskTags}
                  onChange={(e) => setTaskTags(e.target.value)}
                  placeholder="OS, Lab, Viva"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Additional reminders"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Create Task
              </button>
            </div>
          </form>
        )}

        {/* 6. DEADLINE FORM */}
        {activeModal === 'deadline' && (
          <form onSubmit={handleDeadlineSubmit} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Deadline Title *
              </label>
              <input
                required
                type="text"
                value={deadlineTitle}
                onChange={(e) => setDeadlineTitle(e.target.value)}
                placeholder="e.g. Computer Networks Quiz"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Description / Scope
              </label>
              <input
                type="text"
                value={deadlineDesc}
                onChange={(e) => setDeadlineDesc(e.target.value)}
                placeholder="e.g. Subnetting & TCP Flow Control"
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Type *
                </label>
                <select
                  value={deadlineCat}
                  onChange={(e) => setDeadlineCat(e.target.value as DeadlineCategory)}
                  className="w-full h-10 px-2.5 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors font-medium"
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Practical">Practical</option>
                  <option value="PPT">PPT</option>
                  <option value="Project">Project</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Exam">Exam</option>
                  <option value="Event">Event</option>
                </select>
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Due Date & Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full h-10 px-2 bg-surface-container-low rounded-lg text-on-surface text-body-md outline-none focus:bg-surface-container-high transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Save Deadline
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
