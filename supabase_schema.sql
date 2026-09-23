-- ========================================================
-- LIFEDESK: Student Command Center - Production PostgreSQL Schema
-- Run this script in your Supabase Project -> SQL Editor -> New Query -> Run
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  college TEXT DEFAULT '',
  course TEXT DEFAULT '',
  year TEXT DEFAULT '1st Year',
  semester TEXT DEFAULT 'Sem 1',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('College', 'Practical', 'Assignment', 'Exam', 'Project', 'Hackathon', 'Presentation', 'Personal', 'Other')),
  deadline TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Events Table (Calendar Events & Deadlines)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL CHECK (event_type IN ('task', 'deadline', 'hackathon', 'event')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hackathons Table
CREATE TABLE IF NOT EXISTS public.hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  organizer TEXT DEFAULT 'National Tech Consortium',
  registration_deadline TIMESTAMPTZ,
  current_stage TEXT DEFAULT 'Sprint active',
  overall_status TEXT NOT NULL DEFAULT 'In Progress' CHECK (overall_status IN ('Upcoming', 'In Progress', 'Submitted', 'Won', 'Completed')),
  track_name TEXT DEFAULT '',
  deliverable TEXT DEFAULT '',
  banner_image TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Hackathon Milestones Table
CREATE TABLE IF NOT EXISTS public.hackathon_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id UUID REFERENCES public.hackathons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  milestone_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Current', 'Completed', 'Missed')),
  notes TEXT DEFAULT '',
  associated_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transactions Table (Expenses, Income, Transfers - Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_source TEXT CHECK (payment_source IN ('cash', 'upi', 'card', 'Cash', 'UPI', 'Card')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  destination TEXT DEFAULT 'UPI' CHECK (destination IN ('UPI', 'Cash', 'upi', 'cash')),
  transfer_from TEXT DEFAULT 'UPI' CHECK (transfer_from IN ('UPI', 'Cash', 'upi', 'cash')),
  transfer_to TEXT DEFAULT 'Cash' CHECK (transfer_to IN ('UPI', 'Cash', 'upi', 'cash')),
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Settled' CHECK (status IN ('Settled', 'Pending', 'Free Tier')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Row Level Security (RLS) - Complete User Data Isolation
-- ========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Tasks Policies
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Events Policies
DROP POLICY IF EXISTS "Users can manage own events" ON public.events;
CREATE POLICY "Users can manage own events" ON public.events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hackathons Policies
DROP POLICY IF EXISTS "Users can manage own hackathons" ON public.hackathons;
CREATE POLICY "Users can manage own hackathons" ON public.hackathons FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Milestones Policies
DROP POLICY IF EXISTS "Users can manage own milestones" ON public.hackathon_milestones;
CREATE POLICY "Users can manage own milestones" ON public.hackathon_milestones FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========================================================
-- Automatic Profile Creation Trigger on Auth Sign-Up
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, college, course, year, semester, bio, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'college', 'Indore Institute of Science and Technology'),
    COALESCE(NEW.raw_user_meta_data->>'course', 'B.Tech - Artificial Intelligence and Machine Learning'),
    COALESCE(NEW.raw_user_meta_data->>'year', '1st Year'),
    COALESCE(NEW.raw_user_meta_data->>'semester', 'Sem 1'),
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- Enable Supabase Realtime for Multi-device Synchronization
-- ========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles, public.tasks, public.events, public.hackathons, public.hackathon_milestones, public.transactions;
