import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { saveManualSupabaseCredentials, getSupabaseConfig } from '../services/supabaseClient';

export const AuthView: React.FC = () => {
  const {
    theme,
    setTheme,
    authMode,
    setAuthMode,
    login,
    signup,
    signInWithGoogle,
    resendVerification,
    forgotPassword,
    resetPassword,
    showToast,
    isSupabaseConnected,
    recheckSupabaseConnection,
    authError,
    clearAuthError,
    verificationPendingEmail,
    setVerificationPendingEmail,
    openPrivacyPolicy,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [forgotSuccessEmail, setForgotSuccessEmail] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Optional Supabase connection drawer when env vars are missing
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const existingConfig = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(existingConfig.url);
  const [sbAnonKey, setSbAnonKey] = useState(existingConfig.anonKey);

  useEffect(() => {
    setLocalError(null);
    setForgotSuccessEmail(null);
  }, [authMode]);

  const displayedError = localError || authError?.message || null;

  const handleModeSwitch = (mode: 'login' | 'signup' | 'forgot' | 'reset') => {
    setLocalError(null);
    clearAuthError();
    setVerificationPendingEmail(null);
    setForgotSuccessEmail(null);
    setAuthMode(mode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please complete your full name, email address, and password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signup(email.trim(), password, name.trim(), college.trim());
      if (result.ok && result.needsVerification) {
        setPassword('');
        setConfirmPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLocalError(null);
    clearAuthError();
    setIsGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = verificationPendingEmail || email.trim();
    if (!targetEmail) {
      setLocalError('Enter your email address above so we can resend your verification link.');
      return;
    }
    setIsResending(true);
    try {
      await resendVerification(targetEmail);
    } finally {
      setIsResending(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await forgotPassword(email.trim());
      if (ok) {
        setForgotSuccessEmail(email.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (password.length < 6) {
      setLocalError('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await resetPassword('', password);
      if (ok) {
        setPassword('');
        setConfirmPassword('');
        handleModeSwitch('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.trim().startsWith('http') || sbAnonKey.trim().length < 15) {
      setLocalError('Enter a valid Supabase Project URL (https://...) and public anon key.');
      return;
    }
    saveManualSupabaseCredentials(sbUrl.trim(), sbAnonKey.trim());
    setShowSupabaseConfig(false);
    clearAuthError();
    setLocalError(null);
    recheckSupabaseConnection();
    showToast('Supabase configuration saved. You can sign in now.', 'success');
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col">
      {/* Top utility bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch('login')}
          className="flex items-center min-w-0 focus:outline-none"
          aria-label="LifeDesk Home"
        >
          <BrandLogo variant="full" className="h-8 sm:h-9 w-auto" />
        </button>

        <div
          aria-label="Theme selector"
          className="flex items-center bg-surface-container-lowest rounded-xl p-1 border border-outline-variant shadow-xs"
          role="group"
        >
          {(
            [
              { id: 'light', icon: 'light_mode', label: 'Light' },
              { id: 'dark', icon: 'dark_mode', label: 'Dark' },
              { id: 'system', icon: 'desktop_windows', label: 'System' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              title={`${opt.label} Mode`}
              aria-label={`${opt.label} Mode`}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                theme === opt.id
                  ? 'bg-surface-container text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Mint Value Column (Desktop) */}
          <section className="hidden lg:flex lg:col-span-6 flex-col gap-6 p-8 rounded-3xl bg-surface-container border border-outline-variant">
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs font-semibold text-primary-ink">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Student Command Center
              </span>
              <h1 className="font-display-lg text-on-surface tracking-tight">
                Your Life, Organized.
              </h1>
              <p className="font-body-lg text-on-surface-variant leading-relaxed">
                Keep coursework deadlines, hackathon sprints, technical learning notes, and student finances in one calm, mint-clear workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  icon: 'check_box',
                  title: 'Tasks, Practicals & Academic Calendar',
                  desc: 'Track deadlines, exams, and team deliverables in a unified timeline.',
                },
                {
                  icon: 'terminal',
                  title: 'Hackathons & Learning Pipeline',
                  desc: 'Monitor sprint milestones alongside topics you want to master next.',
                },
                {
                  icon: 'account_balance_wallet',
                  title: 'Multi-Source Treasury & Analytics',
                  desc: 'Separate UPI, physical cash, and credit card spending with zero bank credentials.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant flex items-start gap-3.5"
                >
                  <span className="w-10 h-10 rounded-xl bg-surface-container text-primary-ink flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-title-sm text-sm text-on-surface font-bold">
                      {item.title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Auth Card */}
          <section className="lg:col-span-6 flex justify-center w-full">
            <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
              {/* Brand Mark & Heading */}
              <div className="flex flex-col items-center text-center gap-2">
                <BrandLogo variant="full" className="h-9 sm:h-10 w-auto" />
                <p className="font-body-sm text-on-surface-variant">
                  {authMode === 'login' && 'Sign in to access your private LifeDesk workspace'}
                  {authMode === 'signup' && 'Create your student account with email verification'}
                  {authMode === 'forgot' && 'Recover access to your LifeDesk account'}
                  {authMode === 'reset' && 'Choose a new password for your account'}
                </p>
              </div>

              {/* Login / Signup Switcher */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="grid grid-cols-2 bg-surface-container-low rounded-xl p-1 border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className={`h-9 rounded-lg text-xs font-bold transition-colors ${
                      authMode === 'login'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs border border-outline-variant/60'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signup')}
                    className={`h-9 rounded-lg text-xs font-bold transition-colors ${
                      authMode === 'signup'
                        ? 'bg-surface-container-lowest text-on-surface shadow-xs border border-outline-variant/60'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Email Verification Pending Banner */}
              {verificationPendingEmail && (
                <div
                  role="status"
                  className="p-3.5 rounded-2xl bg-surface-container border border-primary/40 text-on-surface flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-primary-ink text-[20px] mt-0.5 flex-shrink-0">
                      mark_email_unread
                    </span>
                    <div className="text-xs leading-relaxed min-w-0 flex-1 break-words">
                      <p className="font-bold text-on-surface">Verify your email address</p>
                      <p className="text-on-surface-variant mt-0.5">
                        We sent a verification link to <strong className="text-on-surface">{verificationPendingEmail}</strong>. Open the link in your inbox, then sign in.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResend}
                      className="text-xs font-bold text-primary-ink hover:underline disabled:opacity-50"
                    >
                      {isResending ? 'Resending...' : 'Resend verification email'}
                    </button>
                    <span className="text-on-surface-variant text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(verificationPendingEmail);
                        handleModeSwitch('login');
                      }}
                      className="text-xs font-bold text-on-surface hover:underline"
                    >
                      Go to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Error Alert */}
              {displayedError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-error-container border border-error/30 text-on-error-container text-xs flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">
                      error
                    </span>
                    <span className="leading-relaxed font-medium min-w-0 flex-1 break-words">{displayedError}</span>
                  </div>
                  {authError?.canResendVerification && !verificationPendingEmail && (
                    <button
                      type="button"
                      disabled={isResending}
                      onClick={handleResend}
                      className="self-start ml-6 font-bold underline hover:opacity-80 disabled:opacity-50"
                    >
                      {isResending ? 'Sending verification link...' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}

              {/* Supabase Missing Config Notice */}
              {!isSupabaseConnected && (
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant text-xs flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 text-on-surface-variant min-w-0 flex-1">
                      <span className="material-symbols-outlined text-primary-ink text-[18px] mt-0.5 flex-shrink-0">
                        cloud_off
                      </span>
                      <span className="min-w-0 flex-1 break-words">
                        <strong className="text-on-surface">Supabase keys required:</strong> Set{' '}
                        <code className="font-mono text-[11px]">VITE_SUPABASE_URL</code> and{' '}
                        <code className="font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> or connect below.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupabaseConfig((prev) => !prev)}
                    className="self-start ml-6 text-xs font-bold text-primary-ink hover:underline"
                  >
                    {showSupabaseConfig ? 'Hide connection settings' : 'Connect Supabase project'}
                  </button>

                  {showSupabaseConfig && (
                    <form onSubmit={handleSaveSupabaseConfig} className="mt-1 pt-2 border-t border-outline-variant flex flex-col gap-2">
                      <input
                        type="url"
                        required
                        value={sbUrl}
                        onChange={(e) => setSbUrl(e.target.value)}
                        placeholder="https://your-project.supabase.co"
                        className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface outline-none focus:border-primary-deep"
                      />
                      <input
                        type="text"
                        required
                        value={sbAnonKey}
                        onChange={(e) => setSbAnonKey(e.target.value)}
                        placeholder="Supabase public anon key"
                        className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface outline-none focus:border-primary-deep font-mono"
                      />
                      <button
                        type="submit"
                        className="h-9 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container hover:text-on-primary-container transition-colors"
                      >
                        Save &amp; Connect
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Google OAuth Button (Login & Sign Up) */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="w-full h-11 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface text-sm font-semibold shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
                  >
                    {isGoogleSubmitting ? (
                      <span className="w-4 h-4 rounded-full border-2 border-primary-ink border-t-transparent animate-spin" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="w-[18px] h-[18px] flex-shrink-0"
                      >
                        <path
                          fill="#4285F4"
                          d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                        />
                      </svg>
                    )}
                    <span>
                      {isGoogleSubmitting
                        ? 'Connecting to Google...'
                        : authMode === 'signup'
                        ? 'Sign up with Google'
                        : 'Continue with Google'}
                    </span>
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-outline-variant/80" />
                    <span className="font-label-xs text-[11px] uppercase tracking-wider text-on-surface-variant">
                      or with email
                    </span>
                    <span className="h-px flex-1 bg-outline-variant/80" />
                  </div>
                </div>
              )}

              {/* 1. LOGIN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <label
                      htmlFor="login-email"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@campus.edu"
                      className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="font-label-xs text-on-surface-variant uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('forgot')}
                        className="text-xs text-primary-ink font-bold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full h-11 px-3.5 pr-11 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="h-11 mt-1 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container hover:text-on-primary-container shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    )}
                    <span>{isSubmitting ? 'Signing In...' : 'Sign In to LifeDesk'}</span>
                  </button>
                </form>
              )}

              {/* 2. SIGN UP FORM */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignup} className="flex flex-col gap-3" noValidate>
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="signup-name"
                      required
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aryan Sharma"
                      className="w-full h-10 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-college"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1"
                    >
                      College / University
                    </label>
                    <input
                      id="signup-college"
                      type="text"
                      autoComplete="organization"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-10 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-email"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1"
                    >
                      Email Address *
                    </label>
                    <input
                      id="signup-email"
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@campus.edu"
                      className="w-full h-10 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1"
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          required
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full h-10 px-3 pr-10 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((visible) => !visible)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-confirm"
                        className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1"
                      >
                        Confirm *
                      </label>
                      <div className="relative">
                        <input
                          id="signup-confirm"
                          required
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full h-10 px-3 pr-10 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={() => setShowConfirmPassword((visible) => !visible)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleSubmitting}
                    className="h-11 mt-1 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container hover:text-on-primary-container shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    )}
                    <span>{isSubmitting ? 'Creating Account...' : 'Create Free Account'}</span>
                  </button>
                </form>
              )}

              {/* 3. FORGOT PASSWORD FORM */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgot} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <h2 className="font-headline-md text-on-surface font-bold">
                      Forgot Password
                    </h2>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Enter your registered email address and we will send a password recovery link via Supabase Auth.
                    </p>
                  </div>

                  {forgotSuccessEmail && (
                    <div
                      role="status"
                      className="p-3 rounded-xl bg-surface-container border border-primary/40 text-xs text-on-surface flex items-start gap-2"
                    >
                      <span className="material-symbols-outlined text-primary-ink text-[18px] mt-0.5 flex-shrink-0">
                        mark_email_read
                      </span>
                      <span>
                        Reset link sent to <strong>{forgotSuccessEmail}</strong>. Open the email link to set a new password.
                      </span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1.5"
                    >
                      Registered Email
                    </label>
                    <input
                      id="forgot-email"
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@campus.edu"
                      className="w-full h-11 px-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container hover:text-on-primary-container shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    )}
                    <span>{isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs text-on-surface-variant hover:text-on-surface font-semibold text-center py-1"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {/* 4. RESET PASSWORD FORM */}
              {authMode === 'reset' && (
                <form onSubmit={handleReset} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <h2 className="font-headline-md text-on-surface font-bold">
                      Set New Password
                    </h2>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Enter and confirm your new LifeDesk password below.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="reset-password"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1.5"
                    >
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="reset-password"
                        required
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full h-11 px-3.5 pr-11 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                        autoFocus
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="font-label-xs text-on-surface-variant uppercase tracking-wider block mb-1.5"
                    >
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="reset-confirm-password"
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full h-11 px-3.5 pr-11 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface text-sm outline-none focus:border-primary-deep focus:bg-surface-container-lowest transition-colors"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container hover:text-on-primary-container shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    )}
                    <span>{isSubmitting ? 'Updating Password...' : 'Update Password'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModeSwitch('login')}
                    className="text-xs text-on-surface-variant hover:text-on-surface font-semibold text-center py-1"
                  >
                    Cancel &amp; Return to Sign In
                  </button>
                </form>
              )}

              {/* Footer */}
              <div className="border-t border-outline-variant/60 pt-3 flex flex-col items-center gap-1.5 text-[11px] text-on-surface-variant">
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <span className="material-symbols-outlined text-[14px] text-primary-ink">lock</span>
                  <span>Protected by Supabase Auth &amp; Row-Level Security</span>
                </div>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    openPrivacyPolicy();
                  }}
                  className="font-semibold text-primary-ink hover:underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
