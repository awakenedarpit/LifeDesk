/**
 * LifeDesk - Supabase Service Layer
 * 
 * Typed CRUD, Auth, and Realtime synchronization for LifeDesk.
 * Uses getSupabaseClient() and falls back gracefully to offline local storage
 * if Supabase is unconfigured or temporarily disconnected.
 */

import { getSupabaseClient } from './supabaseClient';
import {
  UserProfile,
  Task,
  CalendarEvent,
  Hackathon,
  HackathonMilestone,
  Transaction,
  MilestoneStage,
  FeedbackCategory,
  FeedbackEntry,
} from '../types';
import {
  DEFAULT_FEEDBACK_RECIPIENT_EMAIL,
  extractErrorMessage,
  isMissingFeedbackTableError,
} from '../utils/feedbackEmail';

const isEmbeddedInIframe = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export const supabaseService = {
  // ==========================================
  // AUTH
  // ==========================================
  async signUp(email: string, pass: string, name: string, college?: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: name,
          college: college || '',
          course: 'B.Tech - Artificial Intelligence and Machine Learning',
          year: '1st Year',
          semester: 'Sem 1',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async resendVerificationEmail(email: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, pass: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const redirectTo = `${window.location.origin}/auth/callback`;
    const inIframe = isEmbeddedInIframe();

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: inIframe,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;

    // Top-level browser tab: Supabase handles redirect automatically.
    if (!inIframe) {
      return { redirected: true as const, session: null, user: null };
    }

    if (!data?.url) {
      throw new Error('Could not start Google authentication. Please try again.');
    }

    const width = 540;
    const height = 660;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      data.url,
      'lifedesk_google_oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      throw new Error('Pop-up was blocked by your browser. Allow pop-ups for this site and try again.');
    }

    const callbackPayload = await new Promise<{
      code?: string;
      accessToken?: string;
      refreshToken?: string;
      error?: string;
      errorDescription?: string;
    }>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(pollTimer);
        window.clearTimeout(timeoutTimer);
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const msg = event.data as Record<string, unknown> | null;
        if (!msg || msg.type !== 'LIFEDESK_OAUTH_CALLBACK') return;

        settled = true;
        cleanup();
        resolve({
          code: typeof msg.code === 'string' ? msg.code : undefined,
          accessToken: typeof msg.accessToken === 'string' ? msg.accessToken : undefined,
          refreshToken: typeof msg.refreshToken === 'string' ? msg.refreshToken : undefined,
          error: typeof msg.error === 'string' ? msg.error : undefined,
          errorDescription:
            typeof msg.errorDescription === 'string' ? msg.errorDescription : undefined,
        });
      };

      const pollTimer = window.setInterval(() => {
        if (popup.closed && !settled) {
          settled = true;
          cleanup();
          reject(new Error('Google sign-in was cancelled because you closed the sign-in window.'));
        }
      }, 450);

      const timeoutTimer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          try {
            popup.close();
          } catch {
            // Ignore cross-origin close error
          }
          reject(new Error('Google sign-in timed out. Please try again.'));
        }
      }, 180_000);

      window.addEventListener('message', onMessage);
    });

    if (callbackPayload.error || callbackPayload.errorDescription) {
      throw new Error(callbackPayload.errorDescription || callbackPayload.error || 'OAuth cancelled');
    }

    if (callbackPayload.code) {
      const { data: sessionData, error: exchangeError } =
        await client.auth.exchangeCodeForSession(callbackPayload.code);
      if (exchangeError) throw exchangeError;
      return {
        redirected: false as const,
        session: sessionData.session,
        user: sessionData.user,
      };
    }

    if (callbackPayload.accessToken && callbackPayload.refreshToken) {
      const { data: sessionData, error: setSessionError } = await client.auth.setSession({
        access_token: callbackPayload.accessToken,
        refresh_token: callbackPayload.refreshToken,
      });
      if (setSessionError) throw setSessionError;
      return {
        redirected: false as const,
        session: sessionData.session,
        user: sessionData.user,
      };
    }

    // Fallback: verify whether Supabase already synced the session in storage
    const { data: existing } = await client.auth.getSession();
    if (existing.session?.user) {
      return {
        redirected: false as const,
        session: existing.session,
        user: existing.session.user,
      };
    }

    throw new Error('Google sign-in did not return a valid session. Please try again.');
  },

  async signOut() {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) console.warn('Supabase signOut warning:', error.message);
  },

  async resetPasswordForEmail(email: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
  },

  async exchangeCodeForSession(code: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  },

  async updateUserPassword(newPass: string) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client is not configured.');

    const { data, error } = await client.auth.updateUser({
      password: newPass,
    });

    if (error) throw error;
    return data;
  },

  async getSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  },

  // ==========================================
  // PROFILES
  // ==========================================
  async getProfile(userId: string): Promise<UserProfile | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name || 'Student',
      email: data.email || '',
      phone: data.phone || '',
      college: data.college || '',
      course: data.course || '',
      year: data.year || '1st Year',
      semester: data.semester || 'Sem 1',
      currentSemester: data.semester ? `${data.year || ''} ${data.semester}`.trim() : (data.year || '1st Year'),
      bio: data.bio || '',
      avatarUrl: data.avatar_url || '',
    };
  },

  async upsertProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (profile.fullName !== undefined) row.full_name = profile.fullName;
    if (profile.email !== undefined) row.email = profile.email;
    if (profile.phone !== undefined) row.phone = profile.phone;
    if (profile.college !== undefined) row.college = profile.college;
    if (profile.course !== undefined) row.course = profile.course;
    if (profile.year !== undefined) row.year = profile.year;
    if (profile.semester !== undefined) row.semester = profile.semester;
    if (profile.bio !== undefined) row.bio = profile.bio;
    if (profile.avatarUrl !== undefined) row.avatar_url = profile.avatarUrl;

    const { error } = await client.from('profiles').upsert(row);
    if (error) throw error;
  },

  // ==========================================
  // TASKS
  // ==========================================
  async getTasks(userId: string): Promise<Task[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('deadline', { ascending: true });

    if (error) {
      console.warn('Error fetching tasks from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.title,
      description: row.description || '',
      category: row.category,
      deadline: row.deadline,
      priority: row.priority,
      status: row.status,
      notes: row.notes || '',
      tags: row.tags || [],
      participationType: row.participation_type || 'Individual',
      teamName: row.team_name || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  },

  async createTask(userId: string, task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    const { data, error } = await client
      .from('tasks')
      .insert({
        user_id: userId,
        title: task.name,
        description: task.description || '',
        category: task.category,
        deadline: task.deadline,
        priority: task.priority,
        status: task.status || 'Not Started',
        notes: task.notes || '',
        tags: task.tags || [],
        participation_type: task.participationType || 'Individual',
        team_name: task.teamName || null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.title,
      description: data.description || '',
      category: data.category,
      deadline: data.deadline,
      priority: data.priority,
      status: data.status,
      notes: data.notes || '',
      tags: data.tags || [],
      participationType: data.participation_type || 'Individual',
      teamName: data.team_name || '',
      createdAt: data.created_at,
    };
  },

  async updateTask(taskId: string, updates: Partial<Task>, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) row.title = updates.name;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.deadline !== undefined) row.deadline = updates.deadline;
    if (updates.priority !== undefined) row.priority = updates.priority;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.tags !== undefined) row.tags = updates.tags;
    if (updates.participationType !== undefined) row.participation_type = updates.participationType;
    if (updates.teamName !== undefined) row.team_name = updates.teamName || null;

    let query = client.from('tasks').update(row).eq('id', taskId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async deleteTask(taskId: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('tasks').delete().eq('id', taskId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  // ==========================================
  // EVENTS (Calendar events and deadlines)
  // ==========================================
  async getEvents(userId: string): Promise<CalendarEvent[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) {
      console.warn('Error fetching events from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => {
      const startTimeIso = row.start_time || new Date().toISOString();
      const startDate = startTimeIso.split('T')[0];
      const startTime = startTimeIso.includes('T') ? startTimeIso.split('T')[1].substring(0, 5) : '12:00';

      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        category: row.notes || 'Event',
        startDate,
        startTime,
        type: (row.event_type as CalendarEvent['type']) || 'event',
      };
    });
  },

  async createEvent(userId: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    const startDateTime = event.startDate.includes('T')
      ? event.startDate
      : `${event.startDate}T${event.startTime || '12:00'}:00Z`;

    const { data, error } = await client
      .from('events')
      .insert({
        user_id: userId,
        title: event.title,
        description: event.description || '',
        event_type: event.type,
        start_time: startDateTime,
        notes: event.category || '',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      category: data.notes || event.category,
      startDate: data.start_time.split('T')[0],
      startTime: data.start_time.includes('T') ? data.start_time.split('T')[1].substring(0, 5) : '12:00',
      type: data.event_type,
    };
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) row.title = updates.title;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.type !== undefined) row.event_type = updates.type;
    if (updates.category !== undefined) row.notes = updates.category;

    if (updates.startDate) {
      const time = updates.startTime || '12:00';
      row.start_time = updates.startDate.includes('T')
        ? updates.startDate
        : `${updates.startDate}T${time}:00Z`;
    }

    let query = client.from('events').update(row).eq('id', eventId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async deleteEvent(eventId: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('events').delete().eq('id', eventId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  // ==========================================
  // HACKATHONS & MILESTONES
  // ==========================================
  async getHackathons(userId: string): Promise<Hackathon[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data: hacks, error: hackError } = await client
      .from('hackathons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (hackError) {
      console.warn('Error fetching hackathons from Supabase:', hackError.message);
      return [];
    }

    const { data: milestones, error: msError } = await client
      .from('hackathon_milestones')
      .select('*')
      .eq('user_id', userId)
      .order('milestone_date', { ascending: true });

    if (msError) {
      console.warn('Error fetching hackathon milestones:', msError.message);
    }

    const msByHack = (milestones || []).reduce((acc: Record<string, HackathonMilestone[]>, m) => {
      const hId = m.hackathon_id;
      if (!acc[hId]) acc[hId] = [];
      acc[hId].push({
        id: m.id,
        hackathonId: m.hackathon_id,
        stage: (m.name || 'Prototype') as MilestoneStage,
        title: m.name || 'Milestone',
        date: m.milestone_date || new Date().toISOString().split('T')[0],
        status: m.status || 'Pending',
        notes: m.notes || '',
        associatedTaskId: m.associated_task_id || undefined,
      });
      return acc;
    }, {});

    return (hacks || []).map((h) => ({
      id: h.id,
      name: h.name,
      organizer: h.organizer || 'Tech Consortium',
      registrationDeadline: h.registration_deadline || new Date().toISOString(),
      currentStage: h.current_stage || 'Active',
      status: h.overall_status || 'In Progress',
      trackName: h.track_name || '',
      deliverable: h.deliverable || '',
      bannerImage: h.banner_image || '',
      notes: h.notes || '',
      participationType: h.participation_type || 'Individual',
      teamName: h.team_name || '',
      milestones: msByHack[h.id] || [],
    }));
  },

  async createHackathon(userId: string, hack: Omit<Hackathon, 'id'>): Promise<Hackathon> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    const { data: hackData, error: hackError } = await client
      .from('hackathons')
      .insert({
        user_id: userId,
        name: hack.name,
        organizer: hack.organizer || 'Tech Consortium',
        registration_deadline: hack.registrationDeadline || new Date().toISOString(),
        current_stage: hack.currentStage || 'Pitch soon',
        overall_status: hack.status || 'In Progress',
        track_name: hack.trackName || '',
        deliverable: hack.deliverable || '',
        banner_image: hack.bannerImage || '',
        notes: hack.notes || '',
        participation_type: hack.participationType || 'Individual',
        team_name: hack.teamName || null,
      })
      .select()
      .single();

    if (hackError) throw hackError;

    // Insert milestones if any
    let createdMilestones: HackathonMilestone[] = [];
    if (hack.milestones && hack.milestones.length > 0) {
      const msRows = hack.milestones.map((ms) => ({
        hackathon_id: hackData.id,
        user_id: userId,
        name: ms.title || ms.stage,
        milestone_date: ms.date || new Date().toISOString().split('T')[0],
        status: ms.status || 'Pending',
        notes: ms.notes || '',
        associated_task_id: ms.associatedTaskId || null,
      }));

      const { data: msData, error: msError } = await client
        .from('hackathon_milestones')
        .insert(msRows)
        .select();

      if (!msError && msData) {
        createdMilestones = msData.map((m) => ({
          id: m.id,
          hackathonId: m.hackathon_id,
          stage: (m.name || 'Prototype') as MilestoneStage,
          title: m.name,
          date: m.milestone_date,
          status: m.status,
          notes: m.notes,
          associatedTaskId: m.associated_task_id,
        }));
      }
    }

    return {
      id: hackData.id,
      name: hackData.name,
      organizer: hackData.organizer,
      registrationDeadline: hackData.registration_deadline,
      currentStage: hackData.current_stage,
      status: hackData.overall_status,
      trackName: hackData.track_name,
      deliverable: hackData.deliverable,
      bannerImage: hackData.banner_image || '',
      notes: hackData.notes,
      participationType: hackData.participation_type || 'Individual',
      teamName: hackData.team_name || '',
      milestones: createdMilestones,
    };
  },

  async updateHackathon(hackathonId: string, updates: Partial<Hackathon>, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) row.name = updates.name;
    if (updates.organizer !== undefined) row.organizer = updates.organizer;
    if (updates.registrationDeadline !== undefined) row.registration_deadline = updates.registrationDeadline;
    if (updates.currentStage !== undefined) row.current_stage = updates.currentStage;
    if (updates.status !== undefined) row.overall_status = updates.status;
    if (updates.trackName !== undefined) row.track_name = updates.trackName;
    if (updates.deliverable !== undefined) row.deliverable = updates.deliverable;
    if (updates.bannerImage !== undefined) row.banner_image = updates.bannerImage;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.participationType !== undefined) row.participation_type = updates.participationType;
    if (updates.teamName !== undefined) row.team_name = updates.teamName || null;

    let query = client.from('hackathons').update(row).eq('id', hackathonId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async deleteHackathon(hackathonId: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('hackathons').delete().eq('id', hackathonId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async createMilestone(
    userId: string,
    hackathonId: string,
    milestone: {
      stage: MilestoneStage;
      title?: string;
      date: string;
      status?: 'Pending' | 'Current' | 'Completed' | 'Missed';
      notes?: string;
    }
  ): Promise<HackathonMilestone> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    const { data, error } = await client
      .from('hackathon_milestones')
      .insert({
        user_id: userId,
        hackathon_id: hackathonId,
        name: milestone.title || milestone.stage,
        milestone_date: milestone.date || new Date().toISOString().split('T')[0],
        status: milestone.status || 'Pending',
        notes: milestone.notes || '',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      hackathonId: data.hackathon_id,
      stage: (data.name || 'Prototype') as MilestoneStage,
      title: data.name,
      date: data.milestone_date,
      status: data.status,
      notes: data.notes,
    };
  },

  async updateMilestone(milestoneId: string, updates: Partial<HackathonMilestone>, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.stage !== undefined || updates.title !== undefined) {
      row.name = updates.title || updates.stage;
    }
    if (updates.date !== undefined) row.milestone_date = updates.date;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.notes !== undefined) row.notes = updates.notes;

    let query = client.from('hackathon_milestones').update(row).eq('id', milestoneId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async deleteMilestone(milestoneId: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('hackathon_milestones').delete().eq('id', milestoneId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async updateMilestoneStatus(milestoneId: string, status: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client
      .from('hackathon_milestones')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', milestoneId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;

    if (error) throw error;
  },

  // ==========================================
  // TRANSACTIONS (Source of truth for Treasury)
  // ==========================================
  async getTransactions(userId: string): Promise<Transaction[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching transactions from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount) || 0,
      description: row.description,
      category: row.category,
      date: row.transaction_date,
      time: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00',
      paymentSource: row.payment_source,
      destination: row.destination,
      transferFrom: row.transfer_from,
      transferTo: row.transfer_to,
      notes: row.notes,
      status: row.status || 'Settled',
    }));
  },

  async createTransaction(userId: string, tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');

    const paymentSource = tx.paymentSource || (tx.type === 'income' ? tx.destination : 'UPI');

    const { data, error } = await client
      .from('transactions')
      .insert({
        user_id: userId,
        type: tx.type,
        amount: tx.amount,
        payment_source: paymentSource,
        category: tx.category,
        description: tx.description,
        transaction_date: tx.date || new Date().toISOString().split('T')[0],
        destination: tx.destination || (tx.type === 'income' ? 'UPI' : null),
        transfer_from: tx.transferFrom || (tx.type === 'transfer' ? 'UPI' : null),
        transfer_to: tx.transferTo || (tx.type === 'transfer' ? 'Cash' : null),
        notes: tx.notes || '',
        status: tx.status || 'Settled',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      type: data.type,
      amount: Number(data.amount),
      description: data.description,
      category: data.category,
      date: data.transaction_date,
      time: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentSource: data.payment_source,
      destination: data.destination,
      transferFrom: data.transfer_from,
      transferTo: data.transfer_to,
      notes: data.notes,
      status: data.status,
    };
  },

  async updateTransaction(txId: string, updates: Partial<Transaction>, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.type !== undefined) row.type = updates.type;
    if (updates.amount !== undefined) row.amount = updates.amount;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.date !== undefined) row.transaction_date = updates.date;
    if (updates.paymentSource !== undefined) row.payment_source = updates.paymentSource;
    if (updates.destination !== undefined) row.destination = updates.destination;
    if (updates.transferFrom !== undefined) row.transfer_from = updates.transferFrom;
    if (updates.transferTo !== undefined) row.transfer_to = updates.transferTo;
    if (updates.notes !== undefined) row.notes = updates.notes;
    if (updates.status !== undefined) row.status = updates.status;

    let query = client.from('transactions').update(row).eq('id', txId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  async deleteTransaction(txId: string, userId?: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    let query = client.from('transactions').delete().eq('id', txId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
  },

  // ==========================================
  // FEEDBACK
  // ==========================================
  async getFeedbackHistory(userId: string): Promise<FeedbackEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('feedback')
      .select('id, user_id, category, rating, subject, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: (row.category || 'General') as FeedbackCategory,
      rating: Number(row.rating) || 5,
      subject: row.subject || '',
      message: row.message || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  },

  async submitFeedback(
    userId: string,
    payload: {
      category: FeedbackCategory;
      rating: number;
      subject: string;
      message: string;
      senderName?: string;
      senderEmail?: string;
    }
  ): Promise<{
    entry: FeedbackEntry;
    dbSaved: boolean;
    emailForwarded: boolean;
    recipientEmail: string;
    emailNote?: string;
  }> {
    const client = getSupabaseClient();
    const targetRecipient = DEFAULT_FEEDBACK_RECIPIENT_EMAIL;
    const fallbackEntry: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      userId,
      category: payload.category,
      rating: payload.rating,
      subject: payload.subject,
      message: payload.message,
      createdAt: new Date().toISOString(),
    };

    let savedEntry = fallbackEntry;
    let dbSaved = false;
    let accessToken = '';
    let edgeErrorNote = '';
    let dbFallbackNote = '';

    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      let activeSession = sessionData.session;

      // Refresh session if expired or missing access token
      if (!activeSession?.access_token) {
        const refreshed = await client.auth.refreshSession().catch(() => null);
        if (refreshed?.data?.session) {
          activeSession = refreshed.data.session;
        }
      }

      accessToken = activeSession?.access_token || '';
      const effectiveUserId = activeSession?.user?.id || userId;

      if (effectiveUserId) {
        try {
          const { data, error } = await client
            .from('feedback')
            .insert({
              user_id: effectiveUserId,
              category: payload.category,
              rating: payload.rating,
              subject: payload.subject,
              message: payload.message,
            })
            .select('id, user_id, category, rating, subject, message, created_at')
            .maybeSingle();

          if (error) {
            if (isMissingFeedbackTableError(error)) {
              dbFallbackNote =
                'Feedback table is not initialized in Supabase yet (run supabase_schema.sql to enable cloud feedback history).';
            } else {
              console.warn('Supabase feedback insert warning:', extractErrorMessage(error));
              dbFallbackNote = 'Saved locally on this device.';
            }
          } else {
            dbSaved = true;
            if (data) {
              savedEntry = {
                id: data.id,
                userId: data.user_id,
                category: (data.category || payload.category) as FeedbackCategory,
                rating: Number(data.rating) || payload.rating,
                subject: data.subject || payload.subject,
                message: data.message || payload.message,
                createdAt: data.created_at || fallbackEntry.createdAt,
              };
            }
          }
        } catch (dbErr) {
          console.warn('Supabase feedback insert fallback:', extractErrorMessage(dbErr));
          dbFallbackNote = 'Saved locally on this device.';
        }
      }

      // 1. Try Supabase Edge Function (send-feedback-email) first
      if (accessToken) {
        try {
          const { data: fnData, error: fnError } = await client.functions.invoke(
            'send-feedback-email',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              body: {
                category: payload.category,
                rating: payload.rating,
                subject: payload.subject,
                message: payload.message,
              },
            }
          );

          if (!fnError && fnData?.success) {
            return {
              entry: savedEntry,
              dbSaved,
              emailForwarded: true,
              recipientEmail: fnData.to || targetRecipient,
            };
          }

          if (fnError && typeof fnError === 'object' && 'context' in fnError) {
            const ctx = (fnError as { context?: Response }).context;
            if (ctx && typeof ctx.json === 'function') {
              const errJson = (await ctx.json().catch(() => null)) as { error?: string } | null;
              if (errJson?.error) {
                edgeErrorNote = errJson.error;
              }
            }
          }
        } catch {
          // Fall through to same-origin /api/feedback-email relay
        }
      }
    }

    // 2. Fall back to same-origin Express /api/feedback-email route when available
    if (typeof window !== 'undefined' && accessToken) {
      try {
        const res = await fetch('/api/feedback-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            category: payload.category,
            rating: payload.rating,
            subject: payload.subject,
            message: payload.message,
            senderName: payload.senderName,
            senderEmail: payload.senderEmail,
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | { forwarded?: boolean; to?: string; error?: string }
          | null;

        if (res.ok && json?.forwarded) {
          return {
            entry: savedEntry,
            dbSaved,
            emailForwarded: true,
            recipientEmail: json.to || targetRecipient,
          };
        }

        if (json?.error) {
          return {
            entry: savedEntry,
            dbSaved,
            emailForwarded: false,
            recipientEmail: json.to || targetRecipient,
            emailNote: json.error,
          };
        }
      } catch {
        // Ignore network/static-host absence of /api/feedback-email
      }
    }

    return {
      entry: savedEntry,
      dbSaved,
      emailForwarded: false,
      recipientEmail: targetRecipient,
      emailNote:
        edgeErrorNote ||
        dbFallbackNote ||
        `Email forwarding to ${targetRecipient} requires RESEND_API_KEY in server or Supabase Edge Function secrets.`,
    };
  },

  // ==========================================
  // REALTIME SUBSCRIPTIONS
  // ==========================================
  subscribeToUserData(userId: string, onUpdate: (tableName: string) => void) {
    const client = getSupabaseClient();
    if (!client) return () => {};

    const channel = client
      .channel(`lifedesk-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate('tasks')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate('events')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hackathons',
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate('hackathons')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hackathon_milestones',
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate('hackathon_milestones')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate('transactions')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => onUpdate('profiles')
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },
};
