import { supabaseService } from './supabaseService';
import { syncTaskToGoogleCalendar } from './googleCalendarSync';
import type { Task } from '../types';

/**
 * Keeps the existing LifeDesk task workflow intact while adding
 * best-effort Google Calendar synchronization after task CRUD succeeds.
 *
 * Delete is synchronized BEFORE the local task is removed. This is important
 * because the Google event mapping is keyed by the LifeDesk task id, and it
 * guarantees the mapping is still available when the delete request runs.
 */

const PATCH_FLAG = '__lifedeskGoogleCalendarTaskSyncPatched';

type PatchedService = typeof supabaseService & {
  [PATCH_FLAG]?: boolean;
};

const service = supabaseService as PatchedService;

if (!service[PATCH_FLAG]) {
  service[PATCH_FLAG] = true;

  const originalCreateTask = supabaseService.createTask.bind(supabaseService);
  const originalUpdateTask = supabaseService.updateTask.bind(supabaseService);
  const originalDeleteTask = supabaseService.deleteTask.bind(supabaseService);

  supabaseService.createTask = async (...args) => {
    const createdTask = await originalCreateTask(...args);

    void syncTaskToGoogleCalendar('upsert', createdTask).then((synced) => {
      if (!synced) {
        console.info('[LifeDesk] Google Calendar sync skipped or unavailable for new task.');
      }
    });

    return createdTask;
  };

  supabaseService.updateTask = async (...args) => {
    await originalUpdateTask(...args);

    const [taskId] = args;
    const session = await supabaseService.getSession();

    if (!session?.user?.id) return;

    try {
      const currentTasks = await supabaseService.getTasks(session.user.id);
      const updatedTask = currentTasks.find((task) => task.id === taskId);

      if (updatedTask) {
        void syncTaskToGoogleCalendar('upsert', updatedTask).then((synced) => {
          if (!synced) {
            console.info('[LifeDesk] Google Calendar sync skipped or unavailable for updated task.');
          }
        });
      }
    } catch (error) {
      console.warn('[LifeDesk] Could not load updated task for Google Calendar sync:', error);
    }
  };

  supabaseService.deleteTask = async (...args) => {
    const [taskId] = args;

    /*
     * Sync BEFORE deleting the LifeDesk task.
     *
     * The sync function uses taskId -> google_event_id mapping, so doing this
     * first makes the operation deterministic and avoids races with task/UI
     * refreshes after the local delete.
     */
    try {
      const synced = await syncTaskToGoogleCalendar('delete', {
        id: taskId,
      } as Task);

      if (!synced) {
        console.info('[LifeDesk] Google Calendar delete sync skipped or unavailable.');
      }
    } catch (error) {
      /*
       * Calendar sync must never prevent the user's normal LifeDesk delete.
       */
      console.warn('[LifeDesk] Google Calendar delete sync error:', error);
    }

    /*
     * Preserve the existing LifeDesk workflow exactly as before.
     */
    return await originalDeleteTask(...args);
  };
}
