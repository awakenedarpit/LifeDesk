import { AppNavTab } from '../types';

export type AuthRouteMode = 'login' | 'signup' | 'forgot' | 'reset';
export type PublicRoutePage = 'privacy';

export const AUTH_ROUTES: Record<AuthRouteMode, string> = {
  login: '/login',
  signup: '/signup',
  forgot: '/forgot-password',
  reset: '/reset-password',
};

export const PUBLIC_ROUTES: Record<PublicRoutePage, string> = {
  privacy: '/privacy',
};

export const PROTECTED_ROUTES: Record<AppNavTab, string> = {
  dashboard: '/dashboard',
  tasks: '/tasks',
  calendar: '/calendar',
  hackathons: '/hackathons',
  learning: '/learning',
  money: '/money',
  analytics: '/analytics',
  profile: '/profile',
  settings: '/profile',
};

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const cleaned = pathname.trim().replace(/\/+$/, '');
  return cleaned || '/';
}

export function isRecoveryUrl(search = '', hash = ''): boolean {
  const s = (search || '').toLowerCase();
  const h = (hash || '').toLowerCase();
  return s.includes('type=recovery') || h.includes('type=recovery');
}

export function parsePublicPageFromPath(pathname: string): PublicRoutePage | null {
  const p = normalizePathname(pathname).toLowerCase();
  if (p === '/privacy' || p === '/privacy-policy') return 'privacy';
  return null;
}

export function parseAuthModeFromPath(pathname: string): AuthRouteMode | null {
  const p = normalizePathname(pathname).toLowerCase();
  if (p === '/login') return 'login';
  if (p === '/signup' || p === '/register') return 'signup';
  if (p === '/forgot-password') return 'forgot';
  if (p === '/reset-password') return 'reset';
  return null;
}

export function parseTabFromPath(pathname: string): AppNavTab | null {
  const p = normalizePathname(pathname).toLowerCase();
  if (p === '/dashboard') return 'dashboard';
  if (p === '/tasks') return 'tasks';
  if (p === '/calendar') return 'calendar';
  if (p === '/hackathons') return 'hackathons';
  if (p === '/learning') return 'learning';
  if (p === '/money' || p === '/treasury') return 'money';
  if (p === '/analytics') return 'analytics';
  if (p === '/profile' || p === '/settings') return 'profile';
  return null;
}

export interface RouteResolutionInput {
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
  pathname: string;
  search?: string;
  hash?: string;
}

export interface RouteResolutionResult {
  area: 'public' | 'auth' | 'app';
  publicPage: PublicRoutePage | null;
  authMode: AuthRouteMode;
  activeTab: AppNavTab;
  canonicalPath: string;
  shouldRedirect: boolean;
}

export function resolveRoute(input: RouteResolutionInput): RouteResolutionResult {
  const pathname = normalizePathname(input.pathname);
  const recovery = input.isPasswordRecovery || isRecoveryUrl(input.search, input.hash);
  const parsedPublicPage = parsePublicPageFromPath(pathname);
  const parsedAuthMode = parseAuthModeFromPath(pathname);
  const parsedTab = parseTabFromPath(pathname);

  if (parsedPublicPage) {
    return {
      area: 'public',
      publicPage: parsedPublicPage,
      authMode: 'login',
      activeTab: 'dashboard',
      canonicalPath: pathname.toLowerCase(),
      shouldRedirect: false,
    };
  }

  if (recovery) {
    return {
      area: 'auth',
      publicPage: null,
      authMode: 'reset',
      activeTab: 'dashboard',
      canonicalPath: AUTH_ROUTES.reset,
      shouldRedirect: pathname.toLowerCase() !== AUTH_ROUTES.reset,
    };
  }

  if (!input.isAuthenticated) {
    const authMode: AuthRouteMode = parsedAuthMode || 'login';
    const canonicalPath = AUTH_ROUTES[authMode];
    return {
      area: 'auth',
      publicPage: null,
      authMode,
      activeTab: 'dashboard',
      canonicalPath,
      shouldRedirect: pathname.toLowerCase() !== canonicalPath,
    };
  }

  const activeTab: AppNavTab = parsedTab || 'dashboard';
  const canonicalPath = PROTECTED_ROUTES[activeTab];
  return {
    area: 'app',
    publicPage: null,
    authMode: 'login',
    activeTab,
    canonicalPath,
    shouldRedirect: pathname.toLowerCase() !== canonicalPath,
  };
}
