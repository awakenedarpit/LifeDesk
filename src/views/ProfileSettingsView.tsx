import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import {
  SUPABASE_SQL_SCHEMA,
  getSupabaseConfig,
  saveManualSupabaseCredentials,
  clearManualSupabaseCredentials,
} from '../services/supabaseClient';

export const ProfileSettingsView: React.FC = () => {
  const {
    user,
    updateProfile,
    logout,
    deleteAccount,
    showToast,
    resetPassword,
    isSupabaseConnected,
    refreshData,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Profile edit form state
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [college, setCollege] = useState(user.college);
  const [course, setCourse] = useState(user.course);
  const [year, setYear] = useState(user.year || '1st Year');
  const [semester, setSemester] = useState(user.semester || 'Sem 1');
  const [currentSemester, setCurrentSemester] = useState(user.currentSemester);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  // Sync state if user updates from Supabase or session
  React.useEffect(() => {
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone);
    setCollege(user.college);
    setCourse(user.course);
    setYear(user.year || '1st Year');
    setSemester(user.semester || 'Sem 1');
    setCurrentSemester(user.currentSemester);
    setBio(user.bio);
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Manual Supabase Config State
  const initialConfig = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(initialConfig.url);
  const [customKey, setCustomKey] = useState(initialConfig.anonKey);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const computedSemester = [year, semester].filter(Boolean).join(' • ');
    updateProfile({
      fullName,
      email,
      phone,
      college,
      course,
      year,
      semester,
      currentSemester: computedSemester,
      bio,
      avatarUrl,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFullName(user.fullName);
    setEmail(user.email);
    setPhone(user.phone);
    setCollege(user.college);
    setCourse(user.course);
    setYear(user.year || '1st Year');
    setSemester(user.semester || 'Sem 1');
    setCurrentSemester(user.currentSemester);
    setBio(user.bio);
    setAvatarUrl(user.avatarUrl);
    setIsEditing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('Password should be at least 6 characters', 'error');
      return;
    }
    setIsChangingPass(true);
    try {
      const ok = await resetPassword('', newPass);
      if (ok) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setPasswordModalOpen(false);
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      showToast('Please enter both Supabase Project URL and Anon Key', 'error');
      return;
    }
    saveManualSupabaseCredentials(customUrl, customKey);
    showToast('Supabase credentials saved! Reloading application...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleResetConfig = () => {
    clearManualSupabaseCredentials();
    showToast('Manual credentials cleared. Reloading...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    showToast('Supabase SQL Schema copied to clipboard!', 'success');
  };

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight">
          Student Profile &amp; Settings
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Manage your personal student identity, academic metadata, and cloud sync settings.
        </p>
      </div>

      {/* Security Banner */}
      <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3 text-xs">
        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 flex-shrink-0">
          security
        </span>
        <div className="text-on-surface-variant leading-relaxed">
          <span className="font-semibold text-on-surface">Zero-Knowledge Financial Security: </span>
          LifeDesk is a personal student tracker. It never stores, asks for, or connects to banking credentials, UPI PINs, card CVVs, net banking logins, or OTPs. All treasury balances are student-managed.
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm flex flex-col gap-4">
        {/* Avatar & Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-surface-container">
          <img
            src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
            alt={fullName}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary/40 shadow-sm flex-shrink-0"
          />

          <div className="flex-1 text-center sm:text-left min-w-0">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              {user.fullName}
            </h2>
            <p className="font-body-sm text-primary font-medium">
              {user.course}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {user.college} • {user.currentSemester}
            </p>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="h-9 px-4 bg-primary text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="h-9 px-3 bg-surface-container-high text-on-surface rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="h-9 px-4 bg-primary text-on-primary rounded-xl text-xs font-semibold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Profile Details or Edit Form */}
        {!isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Full Name
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.fullName}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Student Email
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block truncate">
                {user.email}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Phone Number
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.phone || 'Not configured'}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                College / Institution
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.college}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Course &amp; Degree
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.course}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Academic Year
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.year || '1st Year'}
              </span>
            </div>

            <div>
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Academic Semester
              </span>
              <span className="font-semibold text-on-surface text-sm mt-0.5 block">
                {user.semester || 'Sem 1'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="font-label-xs text-label-xs text-on-surface-variant uppercase block">
                Short Bio
              </span>
              <p className="font-body-sm text-on-surface text-sm mt-0.5">
                {user.bio || 'Student builder & engineer.'}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Student Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  College / Institution
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Course
                </label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 1st Year"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Academic Semester
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. Sem 1"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
              />
            </div>

            <div>
              <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                Short Bio
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Supabase Architecture & Database Configuration */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">database</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
                  Supabase Cloud Backend
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  isSupabaseConnected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-on-surface-variant'}`} />
                  {isSupabaseConnected ? 'Connected & Active' : 'Offline / Local Ready'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Full-fidelity PostgreSQL DDL with RLS policies, Auth, and Realtime sync.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => refreshData()}
              className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container rounded-lg text-xs font-semibold text-on-surface border border-surface-container transition-colors flex items-center gap-1"
              title="Sync latest records from Supabase"
            >
              <span className="material-symbols-outlined text-[15px]">sync</span>
              <span>Sync</span>
            </button>
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container rounded-lg text-xs font-semibold text-primary border border-surface-container transition-colors"
            >
              {showConfigPanel ? 'Close API Config' : 'Configure API'}
            </button>
            <button
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container rounded-lg text-xs font-semibold text-primary border border-surface-container transition-colors"
            >
              {showSqlSchema ? 'Hide Schema' : 'View SQL DDL'}
            </button>
          </div>
        </div>

        {/* API Credentials Panel */}
        {showConfigPanel && (
          <form onSubmit={handleSaveConfig} className="flex flex-col gap-3 p-3.5 bg-surface-container-low rounded-xl border border-surface-container mt-1">
            <span className="text-xs font-bold text-on-surface">Supabase Project API Credentials</span>
            <div className="flex flex-col gap-2">
              <div>
                <label className="font-label-xs text-[10px] text-on-surface-variant uppercase block mb-1">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://xyzprojectref.supabase.co"
                  className="w-full h-9 px-3 bg-surface-container-lowest rounded-lg text-xs text-on-surface font-mono outline-none border border-surface-container"
                />
              </div>
              <div>
                <label className="font-label-xs text-[10px] text-on-surface-variant uppercase block mb-1">
                  Anon Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full h-9 px-3 bg-surface-container-lowest rounded-lg text-xs text-on-surface font-mono outline-none border border-surface-container"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              {initialConfig.isConfigured && (
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="h-8 px-3 rounded-lg bg-surface-container-high text-xs text-on-surface font-semibold"
                >
                  Clear Manual Key
                </button>
              )}
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-xs"
              >
                Save &amp; Connect
              </button>
            </div>
          </form>
        )}

        {/* SQL Schema Preview */}
        {showSqlSchema && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-mono">
                lifedesk_schema.sql (6 tables + RLS policies + Triggers)
              </span>
              <button
                onClick={handleCopySchema}
                className="px-3 py-1 bg-primary text-on-primary rounded-md text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy SQL</span>
              </button>
            </div>
            <pre className="p-3 bg-surface-container-low text-on-surface rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-surface-container">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>

      {/* Account Security & Actions */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm flex flex-col gap-3">
        <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
          Account Actions
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            <span>Change Password</span>
          </button>

          <button
            onClick={logout}
            className="h-10 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 border border-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="h-10 px-4 rounded-xl bg-error-container/40 hover:bg-error-container/60 text-error text-xs font-semibold flex items-center gap-1.5 border border-error-container ml-auto transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Change Password
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setPasswordModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Current Password *
                </label>
                <input
                  required
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  New Password *
                </label>
                <input
                  required
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div>
                <label className="font-label-xs text-label-xs text-on-surface-variant uppercase block mb-1">
                  Confirm New Password *
                </label>
                <input
                  required
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-on-surface text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 h-10 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold disabled:opacity-50"
                >
                  {isChangingPass ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Account &amp; Wipe Data?"
        message="This will delete your LifeDesk profile, tasks, deadlines, and local treasury transactions permanently. Are you sure?"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          deleteAccount();
        }}
      />
    </div>
  );
};
