import { getSupabaseClient } from './supabaseClient';
import type { Task } from '../types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`;

/**
 * Pushes a LifeDesk task to Google Calendar.
 *
 * This is intentionally best-effort: a Google sync failure must never
 * prevent the user's LifeDesk task from being saved locally/Supabase.
 */
export async function syncTaskToGoogleCalendar(
  action: 'upsert' | 'delete',
  task: Task,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const {
      data: { session },
    } = await client.auth.getSession();

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
