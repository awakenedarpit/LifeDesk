import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';

export const GoogleCalendarConnect: React.FC = () => {
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google_calendar');

    if (result === 'connected') {
      setStatus('connected');
    } else if (result && result !== 'connected') {
      setStatus('error');
    }

    if (result) {
      params.delete('google_calendar');
      const cleanQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const connectGoogleCalendar = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setStatus('error');
      return;
    }

    setConnecting(true);

    try {
      const { data: { session } } = await client.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Please sign in again before connecting Google Calendar.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth?action=start`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Unable to start Google Calendar authorization.');
      }

      const payload = await response.json();

      if (!payload?.url) {
        throw new Error('Google authorization URL was not returned.');
      }

      window.location.assign(payload.url);
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      setStatus('error');
      setConnecting(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-white border border-surface-container flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[21px] text-primary">calendar_month</span>
          </span>
          <div className="min-w-0">
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold">Google Calendar</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Connect Google Calendar for two-way event synchronization.
            </p>
          </div>
        </div>

        <span className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${
          status === 'connected'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : status === 'error'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-surface-container-high text-on-surface-variant'
        }`}>
          {status === 'connected' ? 'Connected' : status === 'error' ? 'Needs attention' : 'Not connected'}
        </span>
      </div>

      <div className="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant leading-relaxed">
        LifeDesk will be able to sync events in both directions after you authorize Google Calendar. Your Google OAuth credentials remain on the secure Supabase backend.
      </div>

      <button
        type="button"
        onClick={connectGoogleCalendar}
        disabled={connecting}
        className="w-full sm:w-auto self-start h-10 px-4 bg-primary text-on-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[17px]">event_available</span>
        {connecting ? 'Connecting…' : status === 'connected' ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
      </button>

      {status === 'error' && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          Google Calendar connection could not be completed. Check the OAuth configuration and try again.
        </p>
      )}
    </section>
  );
};
