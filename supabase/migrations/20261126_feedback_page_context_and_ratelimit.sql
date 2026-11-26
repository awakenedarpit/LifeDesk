-- ========================================================
-- LifeDesk Migration: Feedback Page Context & Rate-Limit Index
-- Safe, additive, idempotent migration — preserves all existing feedback rows.
-- Run in Supabase Project -> SQL Editor -> New Query -> Run
-- ========================================================

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS page_context TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_feedback_user_updated
  ON public.feedback (user_id, updated_at DESC);
