-- LifeDesk Google Calendar one-way task sync
-- Run this in Supabase SQL Editor before deploying google-calendar-sync.

CREATE TABLE IF NOT EXISTS public.google_calendar_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  google_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id),
  UNIQUE(user_id, google_event_id)
);

ALTER TABLE public.google_calendar_event_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Google Calendar links" ON public.google_calendar_event_links;
CREATE POLICY "Users can view own Google Calendar links"
  ON public.google_calendar_event_links
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own Google Calendar links" ON public.google_calendar_event_links;
CREATE POLICY "Users can insert own Google Calendar links"
  ON public.google_calendar_event_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Google Calendar links" ON public.google_calendar_event_links;
CREATE POLICY "Users can update own Google Calendar links"
  ON public.google_calendar_event_links
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own Google Calendar links" ON public.google_calendar_event_links;
CREATE POLICY "Users can delete own Google Calendar links"
  ON public.google_calendar_event_links
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS google_calendar_event_links_user_id_idx
  ON public.google_calendar_event_links(user_id);

CREATE INDEX IF NOT EXISTS google_calendar_event_links_task_id_idx
  ON public.google_calendar_event_links(task_id);

CREATE OR REPLACE FUNCTION public.touch_google_calendar_event_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS google_calendar_event_link_updated_at
  ON public.google_calendar_event_links;

CREATE TRIGGER google_calendar_event_link_updated_at
  BEFORE UPDATE ON public.google_calendar_event_links
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_google_calendar_event_link();
