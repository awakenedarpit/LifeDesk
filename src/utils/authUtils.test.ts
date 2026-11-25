import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRoute,
  parseAuthModeFromPath,
  parseTabFromPath,
  isRecoveryUrl,
} from './authRouting.ts';
import { mapAuthError, isDuplicateSignupResponse } from './authErrors.ts';

test('unauthenticated user on root or private route is redirected to /login', () => {
  for (const path of ['/', '/dashboard', '/tasks', '/calendar', '/hackathons', '/learning', '/money', '/analytics', '/profile']) {
    const res = resolveRoute({
      isAuthenticated: false,
      isPasswordRecovery: false,
      pathname: path,
    });
    assert.equal(res.area, 'auth');
    assert.equal(res.authMode, 'login');
    assert.equal(res.canonicalPath, '/login');
    assert.equal(res.shouldRedirect, true);
  }
});

test('unauthenticated user on /login, /signup, /forgot-password stays on that auth route', () => {
  const loginRes = resolveRoute({ isAuthenticated: false, isPasswordRecovery: false, pathname: '/login' });
  assert.equal(loginRes.authMode, 'login');
  assert.equal(loginRes.shouldRedirect, false);

  const signupRes = resolveRoute({ isAuthenticated: false, isPasswordRecovery: false, pathname: '/signup' });
  assert.equal(signupRes.authMode, 'signup');
  assert.equal(signupRes.shouldRedirect, false);

  const forgotRes = resolveRoute({ isAuthenticated: false, isPasswordRecovery: false, pathname: '/forgot-password' });
  assert.equal(forgotRes.authMode, 'forgot');
  assert.equal(forgotRes.shouldRedirect, false);
});

test('authenticated user on auth routes or root redirects to /dashboard', () => {
  for (const path of ['/', '/login', '/signup', '/forgot-password']) {
    const res = resolveRoute({
      isAuthenticated: true,
      isPasswordRecovery: false,
      pathname: path,
    });
    assert.equal(res.area, 'app');
    assert.equal(res.activeTab, 'dashboard');
    assert.equal(res.canonicalPath, '/dashboard');
    assert.equal(res.shouldRedirect, true);
  }
});

test('authenticated user on private route stays on requested tab', () => {
  const routes: Array<[string, string]> = [
    ['/dashboard', 'dashboard'],
    ['/tasks/', 'tasks'],
    ['/calendar', 'calendar'],
    ['/hackathons', 'hackathons'],
    ['/learning', 'learning'],
    ['/money', 'money'],
    ['/analytics', 'analytics'],
    ['/profile', 'profile'],
  ];

  for (const [pathname, expectedTab] of routes) {
    const res = resolveRoute({
      isAuthenticated: true,
      isPasswordRecovery: false,
      pathname,
    });
    assert.equal(res.area, 'app');
    assert.equal(res.activeTab, expectedTab);
    assert.equal(parseTabFromPath(pathname), expectedTab);
  }
});

test('password recovery state or recovery query/hash forces /reset-password', () => {
  assert.equal(isRecoveryUrl('', '#access_token=abc&type=recovery'), true);
  assert.equal(isRecoveryUrl('?type=recovery&code=xyz', ''), true);

  const res = resolveRoute({
    isAuthenticated: true,
    isPasswordRecovery: true,
    pathname: '/dashboard',
  });
  assert.equal(res.area, 'auth');
  assert.equal(res.authMode, 'reset');
  assert.equal(res.canonicalPath, '/reset-password');
  assert.equal(res.shouldRedirect, true);
});

test('parseAuthModeFromPath parses aliases cleanly', () => {
  assert.equal(parseAuthModeFromPath('/register'), 'signup');
  assert.equal(parseAuthModeFromPath('/reset-password/'), 'reset');
  assert.equal(parseAuthModeFromPath('/unknown'), null);
});

test('mapAuthError maps common Supabase Auth error strings gracefully', () => {
  assert.equal(mapAuthError(new Error('Invalid login credentials')).code, 'invalid_credentials');
  const unconfirmed = mapAuthError(new Error('Email not confirmed'));
  assert.equal(unconfirmed.code, 'email_not_confirmed');
  assert.equal(unconfirmed.canResendVerification, true);
  assert.equal(mapAuthError(new Error('User already registered')).code, 'duplicate_account');
  assert.equal(mapAuthError(new Error('Failed to fetch')).code, 'network_error');
  assert.equal(mapAuthError(new Error('For security purposes, you can only request this after 40 seconds')).code, 'unknown');
  assert.equal(mapAuthError(new Error('Email rate limit exceeded')).code, 'rate_limited');
});

test('mapAuthError maps Google OAuth specific errors gracefully', () => {
  assert.equal(
    mapAuthError(new Error('Unsupported provider: provider is not enabled')).code,
    'oauth_provider_disabled'
  );
  assert.equal(
    mapAuthError(new Error('Pop-up was blocked by your browser')).code,
    'popup_blocked'
  );
  assert.equal(
    mapAuthError(new Error('access_denied')).code,
    'oauth_cancelled'
  );
});

test('isDuplicateSignupResponse detects obfuscated existing user with empty identities', () => {
  assert.equal(isDuplicateSignupResponse({ user: { identities: [] }, session: null }), true);
  assert.equal(isDuplicateSignupResponse({ user: { identities: [{ id: '1' }] }, session: null }), false);
  assert.equal(isDuplicateSignupResponse({ user: { identities: [] }, session: { access_token: 'tok' } }), false);
});
