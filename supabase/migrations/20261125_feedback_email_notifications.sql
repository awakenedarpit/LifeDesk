-- ========================================================
-- LifeDesk Migration: Automatic Feedback Email Notifications
-- Safe, idempotent migration — never recreates public.feedback or deletes rows.
-- Run in Supabase Project -> SQL Editor -> New Query -> Run
-- ========================================================

-- 1. Ensure public.feedback exists (no-op if already present)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('Feature Request', 'Bug Report', 'UI / UX', 'General')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add email delivery tracking columns safely
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_error TEXT,
  ADD COLUMN IF NOT EXISTS email_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add constraints idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_email_status_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_email_status_check
      CHECK (email_status IN ('pending', 'sending', 'sent', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_email_attempts_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_email_attempts_check
      CHECK (email_attempts >= 0);
  END IF;
END $$;

-- 4. Indexes for user history and retry lookups
CREATE INDEX IF NOT EXISTS idx_feedback_user_created
  ON public.feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_email_status
  ON public.feedback (email_status)
  WHERE email_status IN ('pending', 'failed');

-- 5. Least-privilege Row Level Security (RLS)
-- Users can read their own feedback and submit new feedback in initial 'pending' state.
-- Only trusted server/Edge Function code (service_role) updates email delivery metadata.
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;

CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND email_status = 'pending'
    AND email_sent_at IS NULL
    AND email_error IS NULL
    AND email_attempts = 0
    AND email_message_id IS NULL
  );
