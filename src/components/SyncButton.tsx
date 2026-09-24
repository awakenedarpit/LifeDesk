import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { syncGoogleCalendarToLifeDesk } from '../services/googleCalendarSync';

export const SyncButton: React.FC = () => {
  const { refreshData, isAuthenticated, showToast } = useApp();
  const [syncing, setSyncing] = useState(false);

  if (!isAuthenticated) return null;

  const handleSync = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const result = await syncGoogleCalendarToLifeDesk();

      // Only reload LifeDesk data when the user explicitly presses Sync.
      await refreshData();

      const changed = (result.created || 0) + (result.updated || 0) + (result.deleted || 0);
      showToast(
        changed > 0
          ? `Sync complete • ${changed} calendar change${changed === 1 ? '' : 's'} applied`
          : 'Sync complete • Everything is up to date',
        'success',
      );
    } catch (error) {
      console.error('[LifeDesk] Manual Google Calendar sync failed:', error);
      showToast('Sync failed. Your existing LifeDesk data was not cleared.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      title="Sync LifeDesk with Google Calendar"
      aria-label="Sync LifeDesk with Google Calendar"
      className="h-10 px-3 sm:px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-surface-container transition-all disabled:opacity-60 disabled:cursor-wait"
    >
      <span className={`material-symbols-outlined text-[19px] ${syncing ? 'animate-spin' : ''}`}>
        sync
      </span>
      <span className="hidden sm:inline text-xs font-semibold">
        {syncing ? 'Syncing…' : 'Sync'}
      </span>
    </button>
  );
};
