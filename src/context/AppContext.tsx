import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  UserProfile,
  Task,
  TaskStatus,
  Deadline,
  Hackathon,
  Transaction,
  CalendarEvent,
  Balances,
  AppTheme,
  AppNavTab,
  ExpenseCategory,
  PaymentSource,
  IncomeDestination,
} from '../types';
import { storage } from '../services/storage';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Theme
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;

  // Active navigation
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;

  // Auth & Profile
  user: UserProfile;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string, name: string, college?: string) => Promise<boolean>;
  forgotPassword: (email: string) => void;
  resetPassword: (token: string, newPass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  deleteAccount: () => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // Deadlines
  deadlines: Deadline[];
  addDeadline: (dl: Omit<Deadline, 'id'>) => void;
  updateDeadline: (id: string, updates: Partial<Deadline>) => void;
  deleteDeadline: (id: string) => void;

  // Hackathons
  hackathons: Hackathon[];
  addHackathon: (hack: Omit<Hackathon, 'id'>) => void;
  updateHackathon: (id: string, updates: Partial<Hackathon>) => void;
  deleteHackathon: (id: string) => void;
  toggleMilestoneStatus: (hackathonId: string, milestoneId: string) => void;

  // Events
  events: CalendarEvent[];
  addEvent: (evt: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Treasury & Balances
  balances: Balances;
  setBalancesManual: (upi: number, cash: number) => void;
  availableMoney: number;
  monthExpenses: number;
  cardSpending: number;
  totalExpenses: number;
  transactions: Transaction[];
  addExpense: (expense: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: string;
    time?: string;
    paymentSource: PaymentSource;
    notes?: string;
  }) => void;
  addIncome: (income: {
    amount: number;
    description: string;
    destination: IncomeDestination;
    date: string;
    time?: string;
    notes?: string;
  }) => void;
  addTransfer: (transfer: {
    amount: number;
    transferFrom: 'UPI' | 'Cash';
    transferTo: 'UPI' | 'Cash';
    date: string;
    time?: string;
    notes?: string;
  }) => void;
  editTransaction: (id: string, updated: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Quick Action Modal helper
  activeModal: 'none' | 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance';
  openModal: (type: 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance') => void;
  closeModal: () => void;

  // Toasts
  toasts: Toast[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem('lifedesk_theme') as AppTheme) || 'light';
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');

  // Auth & Profile state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('lifedesk_auth') !== 'unauthenticated';
  });
  const [user, setUser] = useState<UserProfile>(() => storage.getProfile());

  // Entity States
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks());
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => storage.getDeadlines());
  const [hackathons, setHackathons] = useState<Hackathon[]>(() => storage.getHackathons());
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  const [events, setEvents] = useState<CalendarEvent[]>(() => storage.getEvents());
  const [balances, setBalances] = useState<Balances>(() => storage.getBalances());

  // Modal & Toast states
  const [activeModal, setActiveModal] = useState<'none' | 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance'>('none');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Theme to HTML class
  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('lifedesk_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const handler = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Auth functions
  const login = async (email: string, _pass: string): Promise<boolean> => {
    setIsAuthenticated(true);
    localStorage.setItem('lifedesk_auth', 'authenticated');
    setUser((prev) => ({ ...prev, email }));
    showToast(`Welcome back, ${user.fullName.split(' ')[0]}!`, 'success');
    return true;
  };

  const signup = async (email: string, _pass: string, name: string, college?: string): Promise<boolean> => {
    setIsAuthenticated(true);
    localStorage.setItem('lifedesk_auth', 'authenticated');
    const updated: UserProfile = { ...user, fullName: name, email, college: college || user.college };
    setUser(updated);
    storage.setProfile(updated);
    showToast(`Welcome to LifeDesk, ${name}!`, 'success');
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('lifedesk_auth', 'unauthenticated');
    showToast('Signed out of LifeDesk session.', 'info');
  };

  const forgotPassword = (email: string) => {
    const dummyToken = `RESET-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Password reset code generated: ${dummyToken} (sent to ${email})`, 'info');
  };

  const resetPassword = async (_token: string, _newPass: string): Promise<boolean> => {
    showToast('Password has been successfully updated!', 'success');
    return true;
  };

  const deleteAccount = () => {
    localStorage.clear();
    showToast('All local data and account profile wiped.', 'info');
    window.location.reload();
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      storage.setProfile(next);
      return next;
    });
    showToast('Profile updated successfully!', 'success');
  };

  // Task actions
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    storage.setTasks(nextTasks);

    // Also auto-add to calendar events
    const newEvent: CalendarEvent = {
      id: `evt-task-${newTask.id}`,
      title: newTask.name,
      description: newTask.description,
      category: newTask.category,
      startDate: newTask.deadline.split('T')[0],
      startTime: newTask.deadline.includes('T') ? newTask.deadline.split('T')[1].substring(0, 5) : '12:00',
      type: 'task',
      referenceId: newTask.id,
    };
    const nextEvents = [...events, newEvent];
    setEvents(nextEvents);
    storage.setEvents(nextEvents);

    showToast(`Task added: "${newTask.name}"`, 'success');
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const nextTasks = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTasks(nextTasks);
    storage.setTasks(nextTasks);
    showToast('Task updated', 'success');
  };

  const deleteTask = (id: string) => {
    const nextTasks = tasks.filter((t) => t.id !== id);
    setTasks(nextTasks);
    storage.setTasks(nextTasks);
    // Also remove from calendar
    const nextEvents = events.filter((e) => e.referenceId !== id);
    setEvents(nextEvents);
    storage.setEvents(nextEvents);
    showToast('Task removed', 'info');
  };

  const toggleTaskStatus = (id: string) => {
    const nextTasks: Task[] = tasks.map((t) => {
      if (t.id === id) {
        const nextStatus: TaskStatus = t.status === 'Completed' ? 'Not Started' : 'Completed';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTasks(nextTasks);
    storage.setTasks(nextTasks);
  };

  // Deadline actions
  const addDeadline = (dlData: Omit<Deadline, 'id'>) => {
    const newDl: Deadline = {
      ...dlData,
      id: `dl-${Date.now()}`,
    };
    const nextDeadlines = [newDl, ...deadlines];
    setDeadlines(nextDeadlines);
    storage.setDeadlines(nextDeadlines);

    // Auto-add to calendar
    const newEvent: CalendarEvent = {
      id: `evt-dl-${newDl.id}`,
      title: newDl.title,
      description: newDl.description,
      category: newDl.category,
      startDate: newDl.dueDate.split('T')[0],
      startTime: newDl.dueDate.includes('T') ? newDl.dueDate.split('T')[1].substring(0, 5) : '23:59',
      type: 'deadline',
      referenceId: newDl.id,
    };
    const nextEvents = [...events, newEvent];
    setEvents(nextEvents);
    storage.setEvents(nextEvents);

    showToast(`Deadline created: ${newDl.title}`, 'success');
  };

  const updateDeadline = (id: string, updates: Partial<Deadline>) => {
    const next = deadlines.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setDeadlines(next);
    storage.setDeadlines(next);
    showToast('Deadline updated', 'success');
  };

  const deleteDeadline = (id: string) => {
    const next = deadlines.filter((d) => d.id !== id);
    setDeadlines(next);
    storage.setDeadlines(next);
    const nextEvents = events.filter((e) => e.referenceId !== id);
    setEvents(nextEvents);
    storage.setEvents(nextEvents);
    showToast('Deadline removed', 'info');
  };

  // Hackathons actions
  const addHackathon = (hackData: Omit<Hackathon, 'id'>) => {
    const newHack: Hackathon = {
      ...hackData,
      id: `hack-${Date.now()}`,
    };
    const next = [newHack, ...hackathons];
    setHackathons(next);
    storage.setHackathons(next);
    showToast(`Hackathon registered: ${newHack.name}`, 'success');
  };

  const updateHackathon = (id: string, updates: Partial<Hackathon>) => {
    const next = hackathons.map((h) => (h.id === id ? { ...h, ...updates } : h));
    setHackathons(next);
    storage.setHackathons(next);
    showToast('Hackathon updated', 'success');
  };

  const deleteHackathon = (id: string) => {
    const next = hackathons.filter((h) => h.id !== id);
    setHackathons(next);
    storage.setHackathons(next);
    showToast('Hackathon deleted', 'info');
  };

  const toggleMilestoneStatus = (hackathonId: string, milestoneId: string) => {
    const next = hackathons.map((h) => {
      if (h.id === hackathonId) {
        const nextMilestones = h.milestones.map((m) => {
          if (m.id === milestoneId) {
            const cycleStatus: Record<string, 'Pending' | 'Current' | 'Completed' | 'Missed'> = {
              Pending: 'Current',
              Current: 'Completed',
              Completed: 'Pending',
              Missed: 'Pending',
            };
            return { ...m, status: cycleStatus[m.status] || 'Pending' };
          }
          return m;
        });
        return { ...h, milestones: nextMilestones };
      }
      return h;
    });
    setHackathons(next);
    storage.setHackathons(next);
  };

  // Events actions
  const addEvent = (evtData: Omit<CalendarEvent, 'id'>) => {
    const newEvt: CalendarEvent = {
      ...evtData,
      id: `evt-${Date.now()}`,
    };
    const next = [...events, newEvt];
    setEvents(next);
    storage.setEvents(next);
    showToast(`Event added: ${newEvt.title}`, 'success');
  };

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    const next = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setEvents(next);
    storage.setEvents(next);
    showToast('Event updated', 'success');
  };

  const deleteEvent = (id: string) => {
    const next = events.filter((e) => e.id !== id);
    setEvents(next);
    storage.setEvents(next);
    showToast('Event removed', 'info');
  };

  // Manual Balance Adjustment
  const setBalancesManual = (upi: number, cash: number) => {
    const newBal: Balances = {
      upiBalance: Math.max(0, upi),
      cashBalance: Math.max(0, cash),
    };
    setBalances(newBal);
    storage.setBalances(newBal);
    showToast(`Treasury updated! UPI: ₹${newBal.upiBalance.toLocaleString('en-IN')}, Cash: ₹${newBal.cashBalance.toLocaleString('en-IN')}`, 'success');
  };

  // Financial Transaction Logic
  const addExpense = (exp: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: string;
    time?: string;
    paymentSource: PaymentSource;
    notes?: string;
  }) => {
    const amount = Number(exp.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid expense amount', 'error');
      return;
    }

    // Deduct from balance based on source
    let newUpi = balances.upiBalance;
    let newCash = balances.cashBalance;

    if (exp.paymentSource === 'UPI') {
      if (newUpi < amount) {
        showToast(`Warning: UPI balance is ₹${newUpi}, but logged ₹${amount}`, 'info');
      }
      newUpi = Math.max(0, newUpi - amount);
    } else if (exp.paymentSource === 'Cash') {
      if (newCash < amount) {
        showToast(`Warning: Cash balance is ₹${newCash}, but logged ₹${amount}`, 'info');
      }
      newCash = Math.max(0, newCash - amount);
    }
    // Note: Card expense does NOT debit liquid cash or UPI!

    const newBalances = { upiBalance: newUpi, cashBalance: newCash };
    setBalances(newBalances);
    storage.setBalances(newBalances);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'expense',
      amount,
      description: exp.description || 'Expense',
      category: exp.category,
      date: exp.date,
      time: exp.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentSource: exp.paymentSource,
      notes: exp.notes,
      status: 'Settled',
    };

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Logged ₹${amount.toLocaleString('en-IN')} via ${exp.paymentSource}`, 'success');
  };

  const addIncome = (inc: {
    amount: number;
    description: string;
    destination: IncomeDestination;
    date: string;
    time?: string;
    notes?: string;
  }) => {
    const amount = Number(inc.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid income amount', 'error');
      return;
    }

    let newUpi = balances.upiBalance;
    let newCash = balances.cashBalance;

    if (inc.destination === 'UPI') {
      newUpi += amount;
    } else {
      newCash += amount;
    }

    const newBalances = { upiBalance: newUpi, cashBalance: newCash };
    setBalances(newBalances);
    storage.setBalances(newBalances);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'income',
      amount,
      description: inc.description || 'Pocket Money',
      category: 'Pocket Money',
      date: inc.date,
      time: inc.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      destination: inc.destination,
      notes: inc.notes,
      status: 'Settled',
    };

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Added ₹${amount.toLocaleString('en-IN')} to ${inc.destination}`, 'success');
  };

  const addTransfer = (trans: {
    amount: number;
    transferFrom: 'UPI' | 'Cash';
    transferTo: 'UPI' | 'Cash';
    date: string;
    time?: string;
    notes?: string;
  }) => {
    const amount = Number(trans.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid transfer amount', 'error');
      return;
    }

    if (trans.transferFrom === trans.transferTo) {
      showToast('Source and destination cannot be identical', 'error');
      return;
    }

    let newUpi = balances.upiBalance;
    let newCash = balances.cashBalance;

    if (trans.transferFrom === 'UPI' && trans.transferTo === 'Cash') {
      newUpi = Math.max(0, newUpi - amount);
      newCash = newCash + amount;
    } else if (trans.transferFrom === 'Cash' && trans.transferTo === 'UPI') {
      newCash = Math.max(0, newCash - amount);
      newUpi = newUpi + amount;
    }

    const newBalances = { upiBalance: newUpi, cashBalance: newCash };
    setBalances(newBalances);
    storage.setBalances(newBalances);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'transfer',
      amount,
      description: `Transfer ${trans.transferFrom} → ${trans.transferTo}`,
      category: 'Transfer',
      date: trans.date,
      time: trans.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transferFrom: trans.transferFrom,
      transferTo: trans.transferTo,
      notes: trans.notes,
      status: 'Settled',
    };

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Transferred ₹${amount.toLocaleString('en-IN')} from ${trans.transferFrom} to ${trans.transferTo}`, 'success');
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    // Rollback balance effect
    let newUpi = balances.upiBalance;
    let newCash = balances.cashBalance;

    if (tx.type === 'expense') {
      if (tx.paymentSource === 'UPI') {
        newUpi += tx.amount;
      } else if (tx.paymentSource === 'Cash') {
        newCash += tx.amount;
      }
    } else if (tx.type === 'income') {
      if (tx.destination === 'UPI') {
        newUpi = Math.max(0, newUpi - tx.amount);
      } else if (tx.destination === 'Cash') {
        newCash = Math.max(0, newCash - tx.amount);
      }
    } else if (tx.type === 'transfer') {
      if (tx.transferFrom === 'UPI' && tx.transferTo === 'Cash') {
        newUpi += tx.amount;
        newCash = Math.max(0, newCash - tx.amount);
      } else if (tx.transferFrom === 'Cash' && tx.transferTo === 'UPI') {
        newCash += tx.amount;
        newUpi = Math.max(0, newUpi - tx.amount);
      }
    }

    const newBalances = { upiBalance: newUpi, cashBalance: newCash };
    setBalances(newBalances);
    storage.setBalances(newBalances);

    const nextTx = transactions.filter((t) => t.id !== id);
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast('Transaction deleted and balance adjusted', 'info');
  };

  const editTransaction = (id: string, updated: Partial<Transaction>) => {
    // Delete and re-apply cleanly
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return;

    deleteTransaction(id);
    const merged = { ...existing, ...updated };

    if (merged.type === 'expense' && merged.paymentSource) {
      addExpense({
        amount: merged.amount,
        description: merged.description,
        category: merged.category as ExpenseCategory,
        date: merged.date,
        time: merged.time,
        paymentSource: merged.paymentSource,
        notes: merged.notes,
      });
    } else if (merged.type === 'income' && merged.destination) {
      addIncome({
        amount: merged.amount,
        description: merged.description,
        destination: merged.destination,
        date: merged.date,
        time: merged.time,
        notes: merged.notes,
      });
    } else if (merged.type === 'transfer' && merged.transferFrom && merged.transferTo) {
      addTransfer({
        amount: merged.amount,
        transferFrom: merged.transferFrom,
        transferTo: merged.transferTo,
        date: merged.date,
        time: merged.time,
        notes: merged.notes,
      });
    }
  };

  // Computed Financial Metrics
  const availableMoney = useMemo(() => {
    return balances.upiBalance + balances.cashBalance;
  }, [balances]);

  // Current month expenses (UPI + Cash outflow)
  const monthExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && (t.paymentSource === 'UPI' || t.paymentSource === 'Cash'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Card spending (billed separately, not debited from liquid UPI/Cash)
  const cardSpending = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.paymentSource === 'Card')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Total expenses across all payment sources
  const totalExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const openModal = (type: 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance') => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal('none');
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        activeTab,
        setActiveTab,
        user,
        isAuthenticated,
        login,
        signup,
        forgotPassword,
        logout,
        updateProfile,
        resetPassword,
        deleteAccount,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        deadlines,
        addDeadline,
        updateDeadline,
        deleteDeadline,
        hackathons,
        addHackathon,
        updateHackathon,
        deleteHackathon,
        toggleMilestoneStatus,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        balances,
        setBalancesManual,
        availableMoney,
        monthExpenses,
        cardSpending,
        totalExpenses,
        transactions,
        addExpense,
        addIncome,
        addTransfer,
        editTransaction,
        deleteTransaction,
        activeModal,
        openModal,
        closeModal,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
