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
} from '../types';

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
        data: {
          full_name: name,
          college: college || 'National Institute of Technology',
          course: 'B.Tech - Artificial Intelligence and Machine Learning',
          year: '1st Year',
          semester: 'Sem 1',
        },
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
      redirectTo: window.location.origin,
    });

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
      avatarUrl: data.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
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
      createdAt: data.created_at,
    };
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
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

    const { error } = await client.from('tasks').update(row).eq('id', taskId);
    if (error) throw error;
  },

  async deleteTask(taskId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('tasks').delete().eq('id', taskId);
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

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
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

    const { error } = await client.from('events').update(row).eq('id', eventId);
    if (error) throw error;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('events').delete().eq('id', eventId);
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
      bannerImage: h.banner_image || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      notes: h.notes || '',
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
      bannerImage: hackData.banner_image,
      notes: hackData.notes,
      milestones: createdMilestones,
    };
  },

  async updateHackathon(hackathonId: string, updates: Partial<Hackathon>): Promise<void> {
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

    const { error } = await client.from('hackathons').update(row).eq('id', hackathonId);
    if (error) throw error;
  },

  async deleteHackathon(hackathonId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('hackathons').delete().eq('id', hackathonId);
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

  async updateMilestone(milestoneId: string, updates: Partial<HackathonMilestone>): Promise<void> {
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

    const { error } = await client.from('hackathon_milestones').update(row).eq('id', milestoneId);
    if (error) throw error;
  },

  async deleteMilestone(milestoneId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('hackathon_milestones').delete().eq('id', milestoneId);
    if (error) throw error;
  },

  async updateMilestoneStatus(milestoneId: string, status: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('hackathon_milestones')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', milestoneId);

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

  async updateTransaction(txId: string, updates: Partial<Transaction>): Promise<void> {
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

    const { error } = await client.from('transactions').update(row).eq('id', txId);
    if (error) throw error;
  },

  async deleteTransaction(txId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.from('transactions').delete().eq('id', txId);
    if (error) throw error;
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
