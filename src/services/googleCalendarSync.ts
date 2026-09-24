import { getSupabaseClient } from './supabaseClient';
import type { Task } from '../types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`;
const PULL_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-pull`;

/** Pushes a LifeDesk task to Google Calendar. */
export async function syncTaskToGoogleCalendar(
  action: 'upsert' | 'delete',
  task: Task,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) return false;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        task: {
          id: task.id,
          user_id: session.user.id,
          title: task.name,
          description: task.description || '',
          deadline: task.deadline,
          category: task.category,
          priority: task.priority,
          status: task.status,
          notes: task.notes || '',
        },
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn('Google Calendar task sync failed:', payload || response.statusText);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Google Calendar task sync error:', error);
    return false;
  }
}

/** Pulls Google Calendar changes into LifeDesk. */
export async function syncGoogleCalendarToLifeDesk(): Promise<{
  ok: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
}> {
  const client = getSupabaseClient();
  if (!client) return { ok: false };

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) return { ok: false };

    const response = await fetch(PULL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn('Google Calendar pull failed:', payload || response.statusText);
      return { ok: false };
    }

    return {
      ok: true,
      created: Number(payload?.created || 0),
      updated: Number(payload?.updated || 0),
      deleted: Number(payload?.deleted || 0),
      skipped: Number(payload?.skipped || 0),
    };
  } catch (error) {
    console.warn('Google Calendar pull error:', error);
    return { ok: false };
  }
}
