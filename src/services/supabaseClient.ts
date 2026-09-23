/**
 * LifeDesk - Supabase Architecture & Client
 * 
 * Pre-configured for Supabase Auth and Database persistence.
 * If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present,
 * queries can be directed to Supabase; otherwise, local offline-first
 * persistence is seamlessly used with full fidelity.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
};

/**
 * Complete Supabase SQL Schema for LifeDesk
 * Ready to run directly in Supabase SQL Editor:
 */
export const SUPABASE_SQL_SCHEMA = `
-- ========================================================
-- LIFEDESK: Student Command Center - Production PostgreSQL Schema
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  college TEXT,
  course TEXT,
  current_semester TEXT,
  bio TEXT,
  avatar_url TEXT,
  semester_name TEXT DEFAULT 'Final Year Sem VII',
  attendance_percent NUMERIC(5,2) DEFAULT 87.00,
  current_day INT DEFAULT 42,
  total_days INT DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Account Balances Table
CREATE TABLE IF NOT EXISTS public.balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  upi_balance NUMERIC(12,2) DEFAULT 5000.00,
  cash_balance NUMERIC(12,2) DEFAULT 1500.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('College', 'Practical', 'Assignment', 'Exam', 'Project', 'Hackathon', 'Presentation', 'Personal', 'Other')),
  deadline TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Deadlines Table
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Assignment', 'Practical', 'PPT', 'Project', 'Hackathon', 'Quiz', 'Exam', 'Event')),
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Due Soon', 'Overdue', 'Completed')),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Hackathons Table
CREATE TABLE IF NOT EXISTS public.hackathons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  organizer TEXT NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('Upcoming', 'In Progress', 'Submitted', 'Won', 'Completed')),
  notes TEXT,
  track_name TEXT,
  deliverable TEXT,
  banner_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Hackathon Milestones Table
CREATE TABLE IF NOT EXISTS public.hackathon_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Registration', 'Idea Submission', 'PPT Submission', 'Screening Quiz', 'Prototype', 'Final Submission', 'Final Pitch')),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Current', 'Completed', 'Missed')),
  notes TEXT,
  associated_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Transactions Table (Expenses, Income, Transfers)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT,
  payment_source TEXT CHECK (payment_source IN ('Cash', 'UPI', 'Card')),
  destination TEXT CHECK (destination IN ('UPI', 'Cash')),
  transfer_from TEXT CHECK (transfer_from IN ('UPI', 'Cash')),
  transfer_to TEXT CHECK (transfer_to IN ('UPI', 'Cash')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Settled' CHECK (status IN ('Settled', 'Pending', 'Free Tier')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  all_day BOOLEAN DEFAULT FALSE,
  type TEXT NOT NULL CHECK (type IN ('task', 'deadline', 'hackathon', 'event')),
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own balances" ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balances" ON public.balances FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own deadlines" ON public.deadlines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own hackathons" ON public.hackathons FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own milestones" ON public.hackathon_milestones FOR ALL USING (
  hackathon_id IN (SELECT id FROM public.hackathons WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
`;
