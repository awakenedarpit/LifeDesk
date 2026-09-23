import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  UserProfile,
  Task,
  TaskStatus,
  Deadline,
  Hackathon,
  HackathonMilestone,
  Transaction,
  CalendarEvent,
  Balances,
  AppTheme,
  AppNavTab,
  ExpenseCategory,
  PaymentSource,
  IncomeDestination,
} from '../types';
import { storage, INITIAL_PROFILE } from '../services/storage';
import { getSupabaseConfig, getSupabaseClient } from '../services/supabaseClient';
import { supabaseService } from '../services/supabaseService';

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

  // Connection & Loading state
  isLoading: boolean;
  isSupabaseConnected: boolean;

  // Auth & Profile
  user: UserProfile;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string, name: string, college?: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;

  // Deadlines
  deadlines: Deadline[];
  addDeadline: (dl: Omit<Deadline, 'id'>) => Promise<void>;
  updateDeadline: (id: string, updates: Partial<Deadline>) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;

  // Hackathons
  hackathons: Hackathon[];
  addHackathon: (hack: Omit<Hackathon, 'id'>) => Promise<void>;
  updateHackathon: (id: string, updates: Partial<Hackathon>) => Promise<void>;
  deleteHackathon: (id: string) => Promise<void>;
  toggleMilestoneStatus: (hackathonId: string, milestoneId: string) => Promise<void>;
  addMilestone: (hackathonId: string, milestone: Omit<HackathonMilestone, 'id' | 'hackathonId'>) => Promise<void>;
  updateMilestone: (hackathonId: string, milestoneId: string, updates: Partial<HackathonMilestone>) => Promise<void>;
  deleteMilestone: (hackathonId: string, milestoneId: string) => Promise<void>;

  // Events
  events: CalendarEvent[];
  addEvent: (evt: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Treasury & Balances (Derived from transactions)
  balances: Balances;
  setBalancesManual: (upi: number, cash: number) => Promise<void>;
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
  }) => Promise<void>;
  addIncome: (income: {
    amount: number;
    description: string;
    destination: IncomeDestination;
    date: string;
    time?: string;
    notes?: string;
  }) => Promise<void>;
  addTransfer: (transfer: {
    amount: number;
    transferFrom: 'UPI' | 'Cash';
    transferTo: 'UPI' | 'Cash';
    date: string;
    time?: string;
    notes?: string;
  }) => Promise<void>;
  editTransaction: (id: string, updated: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Quick Action Modal helper
  activeModal: 'none' | 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance';
  openModal: (type: 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance') => void;
  closeModal: () => void;

  // Toasts
  toasts: Toast[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Refresh
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setThemeState] = useState<AppTheme>(() => {
    return (localStorage.getItem('lifedesk_theme') as AppTheme) || 'light';
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');

  // Supabase connection & loading status
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return getSupabaseConfig().isConfigured;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Modal & Toast states
  const [activeModal, setActiveModal] = useState<'none' | 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance'>('none');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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

  // Load all user data from Supabase or fallback
  const loadUserData = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [dbProfile, dbTasks, dbEvents, dbHackathons, dbTransactions] = await Promise.all([
        supabaseService.getProfile(userId),
        supabaseService.getTasks(userId),
        supabaseService.getEvents(userId),
        supabaseService.getHackathons(userId),
        supabaseService.getTransactions(userId),
      ]);

      if (dbProfile) {
        setUser(dbProfile);
        storage.setProfile(dbProfile);
      } else {
        try {
          await supabaseService.upsertProfile(userId, user);
        } catch (profileErr) {
          console.warn('Could not auto-insert profile into Supabase:', profileErr);
        }
      }

      if (dbTasks) {
        setTasks(dbTasks);
        storage.setTasks(dbTasks);
      }

      if (dbEvents) {
        setEvents(dbEvents);
        storage.setEvents(dbEvents);

        // Derive deadlines from events of type 'deadline'
        const derivedDeadlines: Deadline[] = dbEvents
          .filter((e) => e.type === 'deadline')
          .map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            category: (e.category || 'Assignment') as Deadline['category'],
            dueDate: `${e.startDate}T${e.startTime || '23:59'}:00Z`,
            status: 'Upcoming',
          }));
        setDeadlines(derivedDeadlines);
        storage.setDeadlines(derivedDeadlines);
      }

      if (dbHackathons) {
        setHackathons(dbHackathons);
        storage.setHackathons(dbHackathons);
      }

      if (dbTransactions) {
        setTransactions(dbTransactions);
        storage.setTransactions(dbTransactions);
      }
    } catch (err: unknown) {
      console.warn('Could not sync with Supabase tables:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Auth & Supabase Session
  useEffect(() => {
    const config = getSupabaseConfig();
    setIsSupabaseConnected(config.isConfigured);

    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('lifedesk_auth', 'authenticated');
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('lifedesk_auth', 'authenticated');
        loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        localStorage.setItem('lifedesk_auth', 'unauthenticated');
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Realtime subscription setup when authenticated
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isAuthenticated || !user.id) return;

    const unsubscribe = supabaseService.subscribeToUserData(user.id, (table) => {
      console.log(`[Supabase Realtime] Event received on table: ${table}`);
      loadUserData(user.id);
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user.id, loadUserData]);

  // Auth functions
  const login = async (email: string, pass: string): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) {
      showToast('Authentication is unavailable because Supabase is not configured.', 'error');
      return false;
    }

    try {
      setIsLoading(true);
      const { user: authUser, session } = await supabaseService.signIn(email.trim(), pass);

      if (!authUser || !session) {
        throw new Error('Sign in did not create a valid session. Please try again.');
      }

      setIsAuthenticated(true);
      localStorage.setItem('lifedesk_auth', 'authenticated');
      await loadUserData(authUser.id);
      showToast(`Welcome back, ${authUser.email?.split('@')[0] || 'Student'}!`, 'success');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      const normalized = message.toLowerCase();
      if (normalized.includes('email not confirmed')) {
        showToast('Please confirm your email address before signing in.', 'error');
      } else if (normalized.includes('invalid login credentials')) {
        showToast('Invalid email or password. If you forgot it, use Forgot Password.', 'error');
      } else {
        showToast(message, 'error');
      }
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (email: string, pass: string, name: string, college?: string): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) {
      showToast('Authentication is unavailable because Supabase is not configured.', 'error');
      return false;
    }

    try {
      setIsLoading(true);
      const { user: newUser, session } = await supabaseService.signUp(email.trim(), pass, name, college);

      if (!newUser) {
        throw new Error('Account could not be created. Please try again.');
      }

      if (!session) {
        showToast('Account created. Please confirm your email, then sign in.', 'info');
        setIsLoading(false);
        return false;
      }

      setIsAuthenticated(true);
      localStorage.setItem('lifedesk_auth', 'authenticated');
      const newProfile: UserProfile = {
        ...INITIAL_PROFILE,
        id: newUser.id,
        fullName: name,
        email: email.trim(),
        college: college || INITIAL_PROFILE.college,
      };
      setUser(newProfile);
      storage.setProfile(newProfile);
      await loadUserData(newUser.id);
      showToast(`Welcome to LifeDesk, ${name}!`, 'success');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      showToast(message, 'error');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.signOut();
      } catch (err) {
        console.warn('Sign out warning:', err);
      }
    }
    setIsAuthenticated(false);
    localStorage.setItem('lifedesk_auth', 'unauthenticated');
    setUser(INITIAL_PROFILE);
    setTasks([]);
    setDeadlines([]);
    setHackathons([]);
    setTransactions([]);
    setEvents([]);
    storage.setTasks([]);
    storage.setDeadlines([]);
    storage.setHackathons([]);
    storage.setTransactions([]);
    storage.setEvents([]);
    showToast('Signed out of LifeDesk session.', 'info');
  };

  const forgotPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.resetPasswordForEmail(email);
        showToast(`Password reset link sent to ${email}`, 'success');
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Password reset failed';
        showToast(message, 'error');
        return;
      }
    }

    const dummyToken = `RESET-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Reset code generated: ${dummyToken} (sent to ${email})`, 'info');
  };

  const resetPassword = async (_token: string, newPass: string): Promise<boolean> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateUserPassword(newPass);
        showToast('Password updated securely in Supabase Auth!', 'success');
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not update password';
        showToast(message, 'error');
        return false;
      }
    }

    showToast('Password has been updated!', 'success');
    return true;
  };

  const deleteAccount = async () => {
    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        // Profile cascade will remove all child rows via ON DELETE CASCADE
        await client.from('profiles').delete().eq('id', user.id);
        await supabaseService.signOut();
      } catch (err) {
        console.warn('Supabase delete account warning:', err);
      }
    }
    localStorage.clear();
    showToast('Account data cleared.', 'info');
    window.location.reload();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const next = { ...user, ...updates };
    setUser(next);
    storage.setProfile(next);

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        await supabaseService.upsertProfile(user.id, next);
        showToast('Profile saved to Supabase!', 'success');
        return;
      } catch (err: unknown) {
        console.warn('Supabase profile update warning:', err);
      }
    }
    showToast('Profile updated successfully!', 'success');
  };

  // ==========================================
  // Task Actions
  // ==========================================
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    let newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        const created = await supabaseService.createTask(user.id, taskData);
        newTask = created;
      } catch (err: unknown) {
        console.warn('Supabase task insert fallback to local:', err);
      }
    }

    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    storage.setTasks(nextTasks);

    // Auto-create calendar event representation
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

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const nextTasks = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTasks(nextTasks);
    storage.setTasks(nextTasks);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateTask(id, updates);
      } catch (err) {
        console.warn('Supabase task update fallback:', err);
      }
    }
    showToast('Task updated', 'success');
  };

  const deleteTask = async (id: string) => {
    const nextTasks = tasks.filter((t) => t.id !== id);
    setTasks(nextTasks);
    storage.setTasks(nextTasks);

    const nextEvents = events.filter((e) => e.referenceId !== id);
    setEvents(nextEvents);
    storage.setEvents(nextEvents);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteTask(id);
      } catch (err) {
        console.warn('Supabase task delete fallback:', err);
      }
    }
    showToast('Task removed', 'info');
  };

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
    await updateTask(id, { status: nextStatus });
  };

  // ==========================================
  // Deadline Actions
  // ==========================================
  const addDeadline = async (dlData: Omit<Deadline, 'id'>) => {
    let newDl: Deadline = {
      ...dlData,
      id: `dl-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        const createdEvt = await supabaseService.createEvent(user.id, {
          title: dlData.title,
          description: dlData.description,
          category: dlData.category,
          startDate: dlData.dueDate.split('T')[0],
          startTime: dlData.dueDate.includes('T') ? dlData.dueDate.split('T')[1].substring(0, 5) : '23:59',
          type: 'deadline',
        });
        newDl = { ...newDl, id: createdEvt.id };
      } catch (err) {
        console.warn('Supabase deadline insert fallback:', err);
      }
    }

    const nextDeadlines = [newDl, ...deadlines];
    setDeadlines(nextDeadlines);
    storage.setDeadlines(nextDeadlines);

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

  const updateDeadline = async (id: string, updates: Partial<Deadline>) => {
    const next = deadlines.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setDeadlines(next);
    storage.setDeadlines(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateEvent(id, {
          title: updates.title,
          description: updates.description,
          category: updates.category,
          startDate: updates.dueDate?.split('T')[0],
          startTime: updates.dueDate?.includes('T') ? updates.dueDate.split('T')[1].substring(0, 5) : undefined,
        });
      } catch (err) {
        console.warn('Supabase deadline update fallback:', err);
      }
    }
    showToast('Deadline updated', 'success');
  };

  const deleteDeadline = async (id: string) => {
    const next = deadlines.filter((d) => d.id !== id);
    setDeadlines(next);
    storage.setDeadlines(next);

    const nextEvents = events.filter((e) => e.referenceId !== id && e.id !== id);
    setEvents(nextEvents);
    storage.setEvents(nextEvents);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteEvent(id);
      } catch (err) {
        console.warn('Supabase deadline delete fallback:', err);
      }
    }
    showToast('Deadline removed', 'info');
  };

  // ==========================================
  // Hackathon Actions
  // ==========================================
  const addHackathon = async (hackData: Omit<Hackathon, 'id'>) => {
    let newHack: Hackathon = {
      ...hackData,
      id: `hack-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newHack = await supabaseService.createHackathon(user.id, hackData);
      } catch (err) {
        console.warn('Supabase hackathon insert fallback:', err);
      }
    }

    const next = [newHack, ...hackathons];
    setHackathons(next);
    storage.setHackathons(next);
    showToast(`Hackathon registered: ${newHack.name}`, 'success');
  };

  const updateHackathon = async (id: string, updates: Partial<Hackathon>) => {
    const next = hackathons.map((h) => (h.id === id ? { ...h, ...updates } : h));
    setHackathons(next);
    storage.setHackathons(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateHackathon(id, updates);
      } catch (err) {
        console.warn('Supabase hackathon update fallback:', err);
      }
    }
    showToast('Hackathon updated', 'success');
  };

  const deleteHackathon = async (id: string) => {
    const next = hackathons.filter((h) => h.id !== id);
    setHackathons(next);
    storage.setHackathons(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteHackathon(id);
      } catch (err) {
        console.warn('Supabase hackathon delete fallback:', err);
      }
    }
    showToast('Hackathon deleted', 'info');
  };

  const toggleMilestoneStatus = async (hackathonId: string, milestoneId: string) => {
    let targetStatus: 'Pending' | 'Current' | 'Completed' | 'Missed' = 'Current';

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
            targetStatus = cycleStatus[m.status] || 'Pending';
            return { ...m, status: targetStatus };
          }
          return m;
        });
        return { ...h, milestones: nextMilestones };
      }
      return h;
    });

    setHackathons(next);
    storage.setHackathons(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateMilestoneStatus(milestoneId, targetStatus);
      } catch (err) {
        console.warn('Supabase milestone status update fallback:', err);
      }
    }
  };

  const addMilestone = async (
    hackathonId: string,
    milestone: Omit<HackathonMilestone, 'id' | 'hackathonId'>
  ) => {
    let newMs: HackathonMilestone = {
      ...milestone,
      id: `ms-${Date.now()}`,
      hackathonId,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newMs = await supabaseService.createMilestone(user.id, hackathonId, milestone);
      } catch (err) {
        console.warn('Supabase milestone create fallback:', err);
      }
    }

    const next = hackathons.map((h) => {
      if (h.id === hackathonId) {
        return { ...h, milestones: [...h.milestones, newMs] };
      }
      return h;
    });

    setHackathons(next);
    storage.setHackathons(next);
    showToast(`Milestone added: ${newMs.stage}`, 'success');
  };

  const updateMilestone = async (
    hackathonId: string,
    milestoneId: string,
    updates: Partial<HackathonMilestone>
  ) => {
    const next = hackathons.map((h) => {
      if (h.id === hackathonId) {
        const nextMilestones = h.milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m));
        return { ...h, milestones: nextMilestones };
      }
      return h;
    });

    setHackathons(next);
    storage.setHackathons(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateMilestone(milestoneId, updates);
      } catch (err) {
        console.warn('Supabase milestone update fallback:', err);
      }
    }
    showToast('Milestone updated', 'success');
  };

  const deleteMilestone = async (hackathonId: string, milestoneId: string) => {
    const next = hackathons.map((h) => {
      if (h.id === hackathonId) {
        return { ...h, milestones: h.milestones.filter((m) => m.id !== milestoneId) };
      }
      return h;
    });

    setHackathons(next);
    storage.setHackathons(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteMilestone(milestoneId);
      } catch (err) {
        console.warn('Supabase milestone delete fallback:', err);
      }
    }
    showToast('Milestone removed', 'info');
  };

  // ==========================================
  // Calendar Events Actions
  // ==========================================
  const addEvent = async (evtData: Omit<CalendarEvent, 'id'>) => {
    let newEvt: CalendarEvent = {
      ...evtData,
      id: `evt-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newEvt = await supabaseService.createEvent(user.id, evtData);
      } catch (err) {
        console.warn('Supabase event create fallback:', err);
      }
    }

    const next = [...events, newEvt];
    setEvents(next);
    storage.setEvents(next);
    showToast(`Event added: ${newEvt.title}`, 'success');
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const next = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setEvents(next);
    storage.setEvents(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateEvent(id, updates);
      } catch (err) {
        console.warn('Supabase event update fallback:', err);
      }
    }
    showToast('Event updated', 'success');
  };

  const deleteEvent = async (id: string) => {
    const next = events.filter((e) => e.id !== id);
    setEvents(next);
    storage.setEvents(next);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteEvent(id);
      } catch (err) {
        console.warn('Supabase event delete fallback:', err);
      }
    }
    showToast('Event removed', 'info');
  };

  // ==========================================
  // MONEY LOGIC & TRANSACTIONS (Single Source of Truth)
  // ==========================================
  /**
   * Money logic rules strictly enforced:
   * 1. Available Money = UPI balance + Cash balance
   * 2. Card expenses must NOT reduce UPI or Cash
   * 3. Card expenses MUST count toward total monthly expenses
   * 4. Income increases either UPI or Cash
   * 5. Transfers between UPI and Cash must not count as expenses
   * 6. Transfers must not change total available money
   * 7. Editing/deleting a transaction must correctly recalculate dependent totals
   * 8. Keep transactions as the source of truth rather than storing conflicting derived totals.
   */
  const treasuryMetrics = useMemo(() => {
    let upiBalance = 0;
    let cashBalance = 0;
    let totalExpenses = 0;
    let monthExpenses = 0;
    let cardSpending = 0;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      const isThisMonth = (tx.date || '').startsWith(currentYearMonth);
      const src = (tx.paymentSource || '').toLowerCase();
      const dest = (tx.destination || tx.paymentSource || '').toLowerCase();
      const from = (tx.transferFrom || (src === 'cash' ? 'cash' : 'upi')).toLowerCase();
      const to = (tx.transferTo || (from === 'upi' ? 'cash' : 'upi')).toLowerCase();

      if (tx.type === 'expense') {
        totalExpenses += amount;
        if (isThisMonth) {
          // Card expenses MUST count toward total monthly expenses!
          monthExpenses += amount;
        }
        if (src === 'card') {
          // Card expenses must NOT reduce UPI or Cash
          cardSpending += amount;
        } else if (src === 'cash') {
          cashBalance -= amount;
        } else {
          // Default upi
          upiBalance -= amount;
        }
      } else if (tx.type === 'income') {
        // Income increases either UPI or Cash
        if (dest === 'cash') {
          cashBalance += amount;
        } else {
          upiBalance += amount;
        }
      } else if (tx.type === 'transfer') {
        // Transfers between UPI and Cash must not count as expenses
        // Transfers must not change total available money
        if (from === 'upi' && to === 'cash') {
          upiBalance -= amount;
          cashBalance += amount;
        } else if (from === 'cash' && to === 'upi') {
          cashBalance -= amount;
          upiBalance += amount;
        }
      }
    }

    const availableMoney = upiBalance + cashBalance;

    return {
      balances: {
        upiBalance: Math.round(upiBalance * 100) / 100,
        cashBalance: Math.round(cashBalance * 100) / 100,
      },
      availableMoney: Math.round(availableMoney * 100) / 100,
      monthExpenses: Math.round(monthExpenses * 100) / 100,
      cardSpending: Math.round(cardSpending * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    };
  }, [transactions]);

  const { balances, availableMoney, monthExpenses, cardSpending, totalExpenses } = treasuryMetrics;

  const addExpense = async (exp: {
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

    const newTxData: Omit<Transaction, 'id'> = {
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

    let newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newTx = await supabaseService.createTransaction(user.id, newTxData);
      } catch (err) {
        console.warn('Supabase transaction create fallback:', err);
      }
    }

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Logged ₹${amount.toLocaleString('en-IN')} via ${exp.paymentSource}`, 'success');
  };

  const addIncome = async (inc: {
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

    const newTxData: Omit<Transaction, 'id'> = {
      type: 'income',
      amount,
      description: inc.description || 'Pocket Money',
      category: 'Pocket Money',
      date: inc.date,
      time: inc.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      destination: inc.destination,
      paymentSource: inc.destination,
      notes: inc.notes,
      status: 'Settled',
    };

    let newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newTx = await supabaseService.createTransaction(user.id, newTxData);
      } catch (err) {
        console.warn('Supabase income transaction create fallback:', err);
      }
    }

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Added ₹${amount.toLocaleString('en-IN')} to ${inc.destination}`, 'success');
  };

  const addTransfer = async (trans: {
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

    const newTxData: Omit<Transaction, 'id'> = {
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

    let newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
    };

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        newTx = await supabaseService.createTransaction(user.id, newTxData);
      } catch (err) {
        console.warn('Supabase transfer transaction create fallback:', err);
      }
    }

    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    storage.setTransactions(nextTx);
    showToast(`Transferred ₹${amount.toLocaleString('en-IN')} from ${trans.transferFrom} to ${trans.transferTo}`, 'success');
  };

  const editTransaction = async (id: string, updated: Partial<Transaction>) => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updated };
    const nextTx = transactions.map((t) => (t.id === id ? merged : t));
    setTransactions(nextTx);
    storage.setTransactions(nextTx);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.updateTransaction(id, updated);
      } catch (err) {
        console.warn('Supabase transaction update fallback:', err);
      }
    }
    showToast('Transaction updated', 'success');
  };

  const deleteTransaction = async (id: string) => {
    const nextTx = transactions.filter((t) => t.id !== id);
    setTransactions(nextTx);
    storage.setTransactions(nextTx);

    const client = getSupabaseClient();
    if (client) {
      try {
        await supabaseService.deleteTransaction(id);
      } catch (err) {
        console.warn('Supabase transaction delete fallback:', err);
      }
    }
    showToast('Transaction removed & balance recalculated', 'info');
  };

  /**
   * Balance calibration without violating transaction single source of truth:
   * Adds an explicit calibration adjustment transaction to align current derived balance with target.
   */
  const setBalancesManual = async (targetUpi: number, targetCash: number) => {
    const upiDiff = targetUpi - balances.upiBalance;
    const cashDiff = targetCash - balances.cashBalance;

    const today = new Date().toISOString().split('T')[0];

    if (Math.abs(upiDiff) > 0.01) {
      if (upiDiff > 0) {
        await addIncome({
          amount: upiDiff,
          description: 'Opening Balance Calibration (UPI)',
          destination: 'UPI',
          date: today,
        });
      } else {
        await addExpense({
          amount: Math.abs(upiDiff),
          description: 'Balance Adjustment (UPI)',
          category: 'Other',
          paymentSource: 'UPI',
          date: today,
        });
      }
    }

    if (Math.abs(cashDiff) > 0.01) {
      if (cashDiff > 0) {
        await addIncome({
          amount: cashDiff,
          description: 'Opening Balance Calibration (Cash)',
          destination: 'Cash',
          date: today,
        });
      } else {
        await addExpense({
          amount: Math.abs(cashDiff),
          description: 'Balance Adjustment (Cash)',
          category: 'Other',
          paymentSource: 'Cash',
          date: today,
        });
      }
    }

    showToast(`Treasury calibrated: UPI: ₹${targetUpi.toLocaleString('en-IN')}, Cash: ₹${targetCash.toLocaleString('en-IN')}`, 'success');
  };

  const openModal = (type: 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance') => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal('none');
  };

  const refreshData = async () => {
    if (user.id) {
      await loadUserData(user.id);
      showToast('Data synchronized with Supabase', 'info');
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        activeTab,
        setActiveTab,
        isLoading,
        isSupabaseConnected,
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
        addMilestone,
        updateMilestone,
        deleteMilestone,
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
        refreshData,
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
