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
import {
  AuthRouteMode,
  PublicRoutePage,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  isRecoveryUrl,
  parsePublicPageFromPath,
  resolveRoute,
} from '../utils/authRouting';
import { isDuplicateSignupResponse, mapAuthError, MappedAuthError } from '../utils/authErrors';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  // Theme
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;

  // Active navigation & Auth routes
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  authMode: AuthRouteMode;
  setAuthMode: (mode: AuthRouteMode) => void;
  publicPage: PublicRoutePage | null;
  openPrivacyPolicy: () => void;
  closePublicPage: () => void;

  // Connection & Loading state
  isLoading: boolean;
  isSupabaseConnected: boolean;
  recheckSupabaseConnection: () => void;

  // Auth & Profile
  user: UserProfile;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  authError: MappedAuthError | null;
  clearAuthError: () => void;
  verificationPendingEmail: string | null;
  setVerificationPendingEmail: (email: string | null) => void;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string, name: string, college?: string) => Promise<{ ok: boolean; needsVerification: boolean }>;
  signInWithGoogle: () => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
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

const EMPTY_USER: UserProfile = {
  ...INITIAL_PROFILE,
  id: '',
  fullName: 'Student',
  email: '',
  avatarUrl: '',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state (default 'light', synced with head anti-flash script)
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('lifedesk_theme') as AppTheme | null;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'light';
  });

  // Auth & Route states — always default unauthenticated until Supabase session verifies
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return getSupabaseConfig().isConfigured;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isRecoveryUrl(window.location.search, window.location.hash);
  });

  const [authMode, setAuthModeState] = useState<AuthRouteMode>(() => {
    if (typeof window === 'undefined') return 'login';
    return resolveRoute({
      isAuthenticated: false,
      isPasswordRecovery: isRecoveryUrl(window.location.search, window.location.hash),
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    }).authMode;
  });

  const [activeTab, setActiveTabState] = useState<AppNavTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    return resolveRoute({
      isAuthenticated: true,
      isPasswordRecovery: false,
      pathname: window.location.pathname,
    }).activeTab;
  });

  const [publicPage, setPublicPage] = useState<PublicRoutePage | null>(() => {
    if (typeof window === 'undefined') return null;
    return parsePublicPageFromPath(window.location.pathname);
  });

  const [authError, setAuthError] = useState<MappedAuthError | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);

  // User & Entity States (clean empty defaults until authenticated session loads user records)
  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Modal & Toast states
  const [activeModal, setActiveModal] = useState<'none' | 'expense' | 'income' | 'transfer' | 'task' | 'deadline' | 'hackathon' | 'event' | 'balance'>('none');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Theme management
  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('lifedesk_theme', newTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      const meta = document.getElementById('theme-color-meta');
      if (meta) {
        meta.setAttribute('content', isDark ? '#101B19' : '#F4FAF6');
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

  // URL navigation helpers & route guard synchronization
  const syncPathToRoute = useCallback(
    (nextPath: string, replace = false) => {
      if (typeof window === 'undefined') return;
      if (window.location.pathname !== nextPath) {
        if (replace) {
          window.history.replaceState(null, '', nextPath);
        } else {
          window.history.pushState(null, '', nextPath);
        }
      }
    },
    []
  );

  const setActiveTab = useCallback(
    (tab: AppNavTab) => {
      setPublicPage(null);
      if (!isAuthenticated) {
        setAuthModeState('login');
        syncPathToRoute(AUTH_ROUTES.login, false);
        return;
      }
      const canonical = PROTECTED_ROUTES[tab] || PROTECTED_ROUTES.dashboard;
      setActiveTabState(tab === 'settings' ? 'profile' : tab);
      syncPathToRoute(canonical, false);
    },
    [isAuthenticated, syncPathToRoute]
  );

  const setAuthMode = useCallback(
    (mode: AuthRouteMode) => {
      setPublicPage(null);
      setAuthError(null);
      setAuthModeState(mode);
      if (mode !== 'reset') {
        setIsPasswordRecovery(false);
      }
      syncPathToRoute(AUTH_ROUTES[mode], false);
    },
    [syncPathToRoute]
  );

  const openPrivacyPolicy = useCallback(() => {
    setPublicPage('privacy');
    syncPathToRoute(PUBLIC_ROUTES.privacy, false);
  }, [syncPathToRoute]);

  const closePublicPage = useCallback(() => {
    setPublicPage(null);
    if (isAuthenticated && !isPasswordRecovery) {
      const canonical = PROTECTED_ROUTES[activeTab] || PROTECTED_ROUTES.dashboard;
      syncPathToRoute(canonical, false);
    } else {
      const targetMode = isPasswordRecovery ? 'reset' : authMode;
      syncPathToRoute(AUTH_ROUTES[targetMode], false);
    }
  }, [activeTab, authMode, isAuthenticated, isPasswordRecovery, syncPathToRoute]);

  // Enforce route protection whenever auth state or browser history changes
  useEffect(() => {
    if (isLoading) return;

    const applyRouteResolution = (replace: boolean) => {
      const resolved = resolveRoute({
        isAuthenticated,
        isPasswordRecovery,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });

      if (resolved.area === 'public') {
        setPublicPage(resolved.publicPage);
      } else if (resolved.area === 'auth') {
        setPublicPage(null);
        setAuthModeState(resolved.authMode);
        if (resolved.shouldRedirect) {
          // Preserve query/hash on recovery URL until password is reset
          if (!resolved.authMode || resolved.authMode !== 'reset' || !isRecoveryUrl(window.location.search, window.location.hash)) {
            syncPathToRoute(resolved.canonicalPath, replace);
          }
        }
      } else {
        setPublicPage(null);
        setActiveTabState(resolved.activeTab);
        if (resolved.shouldRedirect) {
          syncPathToRoute(resolved.canonicalPath, replace);
        }
      }
    };

    applyRouteResolution(true);

    const onPopState = () => {
      applyRouteResolution(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isAuthenticated, isPasswordRecovery, isLoading, syncPathToRoute]);

  // Load user data from Supabase scoped strictly to authenticated userId
  const loadUserData = useCallback(
    async (userId: string, fallbackAuthUser?: { email?: string; user_metadata?: Record<string, unknown> }) => {
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

        const metaFullName =
          (fallbackAuthUser?.user_metadata?.full_name as string | undefined) ||
          (fallbackAuthUser?.user_metadata?.name as string | undefined);
        const metaAvatarUrl =
          (fallbackAuthUser?.user_metadata?.avatar_url as string | undefined) ||
          (fallbackAuthUser?.user_metadata?.picture as string | undefined) ||
          '';

        if (dbProfile) {
          const mergedProfile: UserProfile = {
            ...dbProfile,
            fullName:
              dbProfile.fullName && dbProfile.fullName !== 'Student'
                ? dbProfile.fullName
                : metaFullName || dbProfile.fullName || 'Student',
            avatarUrl: dbProfile.avatarUrl || metaAvatarUrl,
          };
          setUser(mergedProfile);
          storage.setProfile(mergedProfile);
        } else {
          const metaName =
            metaFullName ||
            fallbackAuthUser?.email?.split('@')[0] ||
            'Student';
          const fallbackProfile: UserProfile = {
            ...EMPTY_USER,
            id: userId,
            fullName: metaName,
            email: fallbackAuthUser?.email || '',
            college: (fallbackAuthUser?.user_metadata?.college as string | undefined) || '',
            avatarUrl: metaAvatarUrl,
          };
          setUser(fallbackProfile);
          storage.setProfile(fallbackProfile);
          try {
            await supabaseService.upsertProfile(userId, fallbackProfile);
          } catch (profileErr) {
            console.warn('Could not auto-insert profile into Supabase:', profileErr);
          }
        }

        setTasks(dbTasks || []);
        storage.setTasks(dbTasks || []);

        const loadedEvents = dbEvents || [];
        setEvents(loadedEvents);
        storage.setEvents(loadedEvents);

        const derivedDeadlines: Deadline[] = loadedEvents
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

        setHackathons(dbHackathons || []);
        storage.setHackathons(dbHackathons || []);

        setTransactions(dbTransactions || []);
        storage.setTransactions(dbTransactions || []);
      } catch (err: unknown) {
        console.warn('Could not sync with Supabase tables:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const initializeAuthSession = useCallback(async () => {
    const config = getSupabaseConfig();
    setIsSupabaseConnected(config.isConfigured);

    const client = getSupabaseClient();
    if (!client) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      const code = searchParams.get('code');
      const oauthError =
        searchParams.get('error_description') ||
        hashParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams.get('error');
      const recovery = isRecoveryUrl(window.location.search, window.location.hash);

      // Static-host fallback: if /auth/callback opened inside an OAuth popup, relay back to opener
      if (
        window.location.pathname.replace(/\/+$/, '') === '/auth/callback' &&
        window.opener &&
        !window.opener.closed
      ) {
        const relayPayload = {
          type: 'LIFEDESK_OAUTH_CALLBACK',
          code: code || '',
          accessToken: hashParams.get('access_token') || '',
          refreshToken: hashParams.get('refresh_token') || '',
          error: searchParams.get('error') || hashParams.get('error') || '',
          errorDescription:
            searchParams.get('error_description') ||
            hashParams.get('error_description') ||
            '',
        };
        try {
          window.opener.postMessage(relayPayload, window.location.origin);
        } catch {
          window.opener.postMessage(relayPayload, '*');
        }
        window.close();
        return;
      }

      if (oauthError) {
        setAuthError(mapAuthError(new Error(oauthError)));
        if (window.location.search || window.location.hash) {
          window.history.replaceState(null, '', AUTH_ROUTES.login);
        }
      }

      if (recovery) {
        if (code) {
          const { data: existing } = await client.auth.getSession();
          if (!existing.session) {
            try {
              await supabaseService.exchangeCodeForSession(code);
            } catch (exchangeErr) {
              setAuthError(mapAuthError(exchangeErr));
            }
          }
        }
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        setAuthModeState('reset');
        setIsLoading(false);
        return;
      }

      let {
        data: { session },
      } = await client.auth.getSession();

      if (!session && code) {
        try {
          const exchanged = await supabaseService.exchangeCodeForSession(code);
          session = exchanged.session;
        } catch (exchangeErr) {
          setAuthError(mapAuthError(exchangeErr));
        }
      }

      if (session?.user) {
        if (code || hashParams.has('access_token')) {
          window.history.replaceState(null, '', PROTECTED_ROUTES.dashboard);
        }
        setIsAuthenticated(true);
        localStorage.setItem('lifedesk_auth', 'authenticated');
        await loadUserData(session.user.id, session.user);
      } else {
        setIsAuthenticated(false);
        localStorage.setItem('lifedesk_auth', 'unauthenticated');
        setIsLoading(false);
      }
    } catch (err) {
      setAuthError(mapAuthError(err));
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [loadUserData]);

  // Initialize Auth session on mount
  useEffect(() => {
    initializeAuthSession();
  }, [initializeAuthSession]);

  // Subscribe to Supabase auth state changes whenever a valid client is connected
  useEffect(() => {
    if (!isSupabaseConnected) return;
    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        setAuthModeState('reset');
        syncPathToRoute(AUTH_ROUTES.reset, true);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        if (isRecoveryUrl(window.location.search, window.location.hash)) {
          setIsPasswordRecovery(true);
          setIsAuthenticated(false);
          setAuthModeState('reset');
          setIsLoading(false);
          return;
        }
        setIsPasswordRecovery(false);
        setIsAuthenticated(true);
        setAuthError(null);
        setVerificationPendingEmail(null);
        localStorage.setItem('lifedesk_auth', 'authenticated');
        loadUserData(session.user.id, session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setIsAuthenticated(false);
        localStorage.setItem('lifedesk_auth', 'unauthenticated');
        setUser(EMPTY_USER);
        setTasks([]);
        setDeadlines([]);
        setHackathons([]);
        setTransactions([]);
        setEvents([]);
        storage.clearUserDataCache();
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSupabaseConnected, loadUserData, syncPathToRoute]);

  const recheckSupabaseConnection = useCallback(() => {
    initializeAuthSession();
  }, [initializeAuthSession]);

  // Realtime subscription setup when authenticated
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isAuthenticated || !user.id) return;

    const unsubscribe = supabaseService.subscribeToUserData(user.id, () => {
      loadUserData(user.id);
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user.id, loadUserData]);

  // Auth functions
  const login = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }

    try {
      const { user: authUser, session } = await supabaseService.signIn(email.trim(), pass);

      if (!authUser || !session) {
        throw new Error('Sign in did not create a valid session. Please try again.');
      }

      setIsPasswordRecovery(false);
      setIsAuthenticated(true);
      setVerificationPendingEmail(null);
      localStorage.setItem('lifedesk_auth', 'authenticated');
      await loadUserData(authUser.id, authUser);
      setActiveTabState('dashboard');
      syncPathToRoute(PROTECTED_ROUTES.dashboard, true);
      showToast(`Welcome back, ${authUser.email?.split('@')[0] || 'Student'}!`, 'success');
      return true;
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      if (mapped.code === 'email_not_confirmed') {
        setVerificationPendingEmail(email.trim());
      }
      showToast(mapped.message, 'error');
      return false;
    }
  };

  const signup = async (
    email: string,
    pass: string,
    name: string,
    college?: string
  ): Promise<{ ok: boolean; needsVerification: boolean }> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return { ok: false, needsVerification: false };
    }

    try {
      const cleanEmail = email.trim();
      const data = await supabaseService.signUp(cleanEmail, pass, name.trim(), college?.trim());

      if (isDuplicateSignupResponse(data)) {
        const dupErr = mapAuthError(new Error('User already registered'));
        setAuthError(dupErr);
        showToast(dupErr.message, 'error');
        return { ok: false, needsVerification: false };
      }

      const { user: newUser, session } = data;
      if (!newUser) {
        throw new Error('Account could not be created. Please try again.');
      }

      if (!session) {
        setVerificationPendingEmail(cleanEmail);
        showToast('Verification email sent. Confirm your email to sign in.', 'info');
        return { ok: true, needsVerification: true };
      }

      setIsPasswordRecovery(false);
      setIsAuthenticated(true);
      localStorage.setItem('lifedesk_auth', 'authenticated');
      const newProfile: UserProfile = {
        ...EMPTY_USER,
        id: newUser.id,
        fullName: name.trim(),
        email: cleanEmail,
        college: college?.trim() || '',
      };
      setUser(newProfile);
      storage.setProfile(newProfile);
      await loadUserData(newUser.id, newUser);
      setActiveTabState('dashboard');
      syncPathToRoute(PROTECTED_ROUTES.dashboard, true);
      showToast(`Welcome to LifeDesk, ${name.trim()}!`, 'success');
      return { ok: true, needsVerification: false };
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return { ok: false, needsVerification: false };
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }

    try {
      const result = await supabaseService.signInWithGoogle();
      if (result.redirected) {
        return true;
      }

      const authUser = result.user || result.session?.user;
      if (!authUser || !result.session) {
        throw new Error('Google sign-in did not create a valid session. Please try again.');
      }

      setIsPasswordRecovery(false);
      setIsAuthenticated(true);
      setVerificationPendingEmail(null);
      localStorage.setItem('lifedesk_auth', 'authenticated');
      await loadUserData(authUser.id, authUser);
      setActiveTabState('dashboard');
      syncPathToRoute(PROTECTED_ROUTES.dashboard, true);
      const displayName =
        (authUser.user_metadata?.full_name as string | undefined) ||
        (authUser.user_metadata?.name as string | undefined) ||
        authUser.email?.split('@')[0] ||
        'Student';
      showToast(`Welcome to LifeDesk, ${displayName}!`, 'success');
      return true;
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }
  };

  const resendVerification = async (email: string): Promise<boolean> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }

    try {
      await supabaseService.resendVerificationEmail(email.trim());
      showToast(`Verification email resent to ${email.trim()}`, 'success');
      return true;
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      showToast(mapped.message, 'error');
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
    setIsPasswordRecovery(false);
    setIsAuthenticated(false);
    setVerificationPendingEmail(null);
    setAuthError(null);
    localStorage.setItem('lifedesk_auth', 'unauthenticated');
    setUser(EMPTY_USER);
    setTasks([]);
    setDeadlines([]);
    setHackathons([]);
    setTransactions([]);
    setEvents([]);
    storage.clearUserDataCache();
    setAuthModeState('login');
    syncPathToRoute(AUTH_ROUTES.login, true);
    showToast('Signed out of LifeDesk session.', 'info');
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }

    try {
      await supabaseService.resetPasswordForEmail(email.trim());
      showToast(`Password reset link sent to ${email.trim()}`, 'success');
      return true;
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }
  };

  const resetPassword = async (_token: string, newPass: string): Promise<boolean> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const mapped = mapAuthError(new Error('Supabase client is not configured.'));
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }

    try {
      await supabaseService.updateUserPassword(newPass);
      setIsPasswordRecovery(false);
      // Clean recovery tokens out of the URL after successful update
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, '', AUTH_ROUTES.login);
      }
      showToast('Password updated securely! Sign in with your new password.', 'success');
      return true;
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setAuthError(mapped);
      showToast(mapped.message, 'error');
      return false;
    }
  };

  const deleteAccount = async () => {
    const client = getSupabaseClient();

    if (client && user.id) {
      try {
        const { error } = await client.functions.invoke('delete-account');

        if (error) {
          console.error('Account deletion failed:', error);
          showToast('Account deletion could not be completed. Your data is still safe.', 'error');
          return;
        }

        await supabaseService.signOut();
      } catch (err) {
        console.error('Account deletion failed:', err);
        showToast('Account deletion could not be completed. Please try again.', 'error');
        return;
      }
    }

    storage.clearUserDataCache();
    localStorage.removeItem('lifedesk_auth');
    setIsAuthenticated(false);
    setUser(EMPTY_USER);
    showToast('Your LifeDesk account and data have been deleted.', 'success');
    syncPathToRoute(AUTH_ROUTES.login, true);
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

    const linkedTask = nextTasks.find((t) => t.id === id);
    if (linkedTask) {
      const [datePart, timePart] = (linkedTask.deadline || '').split('T');
      const nextEvents = events.map((event) =>
        event.referenceId === id
          ? {
              ...event,
              title: linkedTask.name,
              description: linkedTask.description,
              category: linkedTask.category,
              startDate: datePart || event.startDate,
              startTime: timePart ? timePart.substring(0, 5) : event.startTime,
            }
          : event
      );
      setEvents(nextEvents);
      storage.setEvents(nextEvents);
    }

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        await supabaseService.updateTask(id, updates, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.deleteTask(id, user.id);
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

    const updatedDeadline = next.find((d) => d.id === id);
    if (updatedDeadline) {
      const [datePart, timePart] = (updatedDeadline.dueDate || '').split('T');
      const nextEvents = events.map((event) =>
        event.referenceId === id
          ? {
              ...event,
              title: updatedDeadline.title,
              description: updatedDeadline.description,
              category: updatedDeadline.category,
              startDate: datePart || event.startDate,
              startTime: timePart ? timePart.substring(0, 5) : event.startTime,
            }
          : event
      );
      setEvents(nextEvents);
      storage.setEvents(nextEvents);
    }

    const client = getSupabaseClient();
    if (client && user.id) {
      try {
        await supabaseService.updateEvent(
          id,
          {
            title: updates.title,
            description: updates.description,
            category: updates.category,
            startDate: updates.dueDate?.split('T')[0],
            startTime: updates.dueDate?.includes('T') ? updates.dueDate.split('T')[1].substring(0, 5) : undefined,
          },
          user.id
        );
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
    if (client && user.id) {
      try {
        await supabaseService.deleteEvent(id, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.updateHackathon(id, updates, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.deleteHackathon(id, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.updateMilestoneStatus(milestoneId, targetStatus, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.updateMilestone(milestoneId, updates, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.deleteMilestone(milestoneId, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.updateEvent(id, updates, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.deleteEvent(id, user.id);
      } catch (err) {
        console.warn('Supabase event delete fallback:', err);
      }
    }
    showToast('Event removed', 'info');
  };

  // ==========================================
  // MONEY LOGIC & TRANSACTIONS (Single Source of Truth)
  // ==========================================
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
          monthExpenses += amount;
        }
        if (src === 'card') {
          cardSpending += amount;
        } else if (src === 'cash') {
          cashBalance -= amount;
        } else {
          upiBalance -= amount;
        }
      } else if (tx.type === 'income') {
        if (dest === 'cash') {
          cashBalance += amount;
        } else {
          upiBalance += amount;
        }
      } else if (tx.type === 'transfer') {
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
    if (client && user.id) {
      try {
        await supabaseService.updateTransaction(id, updated, user.id);
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
    if (client && user.id) {
      try {
        await supabaseService.deleteTransaction(id, user.id);
      } catch (err) {
        console.warn('Supabase transaction delete fallback:', err);
      }
    }
    showToast('Transaction removed & balance recalculated', 'info');
  };

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
        authMode,
        setAuthMode,
        publicPage,
        openPrivacyPolicy,
        closePublicPage,
        isLoading,
        isSupabaseConnected,
        recheckSupabaseConnection,
        user,
        isAuthenticated,
        isPasswordRecovery,
        authError,
        clearAuthError,
        verificationPendingEmail,
        setVerificationPendingEmail,
        login,
        signup,
        signInWithGoogle,
        resendVerification,
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
