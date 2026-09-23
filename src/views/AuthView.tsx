import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const AuthView: React.FC = () => {
  const { login, signup, forgotPassword, resetPassword, showToast } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup state
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');

  // Reset state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in email and password', 'error');
      return;
    }
    const success = login(email, password);
    if (!success) {
      showToast('Invalid credentials. (Or click Quick Demo Login below)', 'error');
    }
  };

  const handleQuickDemo = () => {
    login('aryan.sharma@campus.edu', 'student123');
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    signup(email, password, name, college);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Enter your registered email address', 'error');
      return;
    }
    forgotPassword(email);
    setAuthMode('reset');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      showToast('Please fill in reset token and new password', 'error');
      return;
    }
    resetPassword(resetToken, newPassword);
    setAuthMode('login');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-surface text-on-surface">
      <div className="w-full max-w-md bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-on-primary shadow-md">
            <span className="material-symbols-outlined text-[32px]">dataset</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold tracking-tight text-on-surface mt-2">
            LifeDesk
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
            Your Life, Organized.
          </p>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-semibold mt-1">
            Personal Student Command Center
          </span>
        </div>

        {/* Tab Switcher for Login / Signup */}
        {(authMode === 'login' || authMode === 'signup') && (
          <div className="flex bg-surface-container-high rounded-xl p-1 border border-surface-container">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                authMode === 'login'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                authMode === 'signup'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Student Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aryan.sharma@campus.edu"
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none focus:bg-surface-container-high transition-colors"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none focus:bg-surface-container-high transition-colors"
              />
            </div>

            <button
              type="submit"
              className="h-11 mt-1 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-semibold hover:bg-primary-container shadow-sm active:scale-95 transition-all"
            >
              Sign In to LifeDesk
            </button>

            {/* Quick Demo Login One-Click */}
            <div className="pt-2 border-t border-surface-container flex flex-col gap-2">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="h-10 px-3 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
                <span>Quick Demo Login (Pre-loaded Aryan Sharma)</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Full Name *
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aryan Sharma"
                className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                College / University
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. National Institute of Technology"
                className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Student Email *
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aryan@college.edu"
                className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Create Password *
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              className="h-11 mt-1 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-semibold hover:bg-primary-container shadow-sm active:scale-95 transition-all"
            >
              Create Account
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgot} className="flex flex-col gap-3.5">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Reset Password
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Enter your student email address to receive password reset instructions.
              </p>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aryan.sharma@campus.edu"
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="h-11 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-semibold hover:bg-primary-container shadow-sm transition-all"
            >
              Send Reset Code
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="text-xs text-on-surface-variant hover:text-on-surface text-center py-1"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* 4. ENTER RESET CODE */}
        {authMode === 'reset' && (
          <form onSubmit={handleReset} className="flex flex-col gap-3.5">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Set New Password
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                We've generated your password reset token. Enter it below to set your new password.
              </p>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                Reset Token (Check notification toast)
              </label>
              <input
                required
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="e.g. DEMO-123456"
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none font-mono"
                autoFocus
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                New Password
              </label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              className="h-11 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-semibold hover:bg-primary-container shadow-sm transition-all"
            >
              Confirm Password Reset
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="text-xs text-on-surface-variant hover:text-on-surface text-center py-1"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Security disclaimer footer */}
        <p className="text-[11px] text-center text-on-surface-variant/80 border-t border-surface-container pt-3">
          🔒 LifeDesk student accounts are secured locally and cloud-ready for Supabase Auth.
        </p>
      </div>
    </div>
  );
};
