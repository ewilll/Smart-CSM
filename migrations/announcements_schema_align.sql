-- Align public.announcements with the React app (AdminDashboard, GlobalTicker, History).
-- Fixes PostgREST: "Could not find the 'title' column of 'announcements' in the schema cache"
-- when an older migration used `subject` + `category` instead of `title` + `type`.
--
-- Run once in Supabase → SQL Editor for the project used by VITE_SUPABASE_URL.

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS type TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'subject'
  ) THEN
    UPDATE public.announcements
    SET title = COALESCE(NULLIF(btrim(title), ''), btrim(subject))
    WHERE subject IS NOT NULL AND btrim(COALESCE(subject, '')) <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'category'
  ) THEN
    UPDATE public.announcements
    SET type = COALESCE(NULLIF(btrim(type), ''), btrim(category))
    WHERE category IS NOT NULL AND btrim(COALESCE(category, '')) <> '';
  END IF;
END $$;

UPDATE public.announcements SET title = 'Advisory' WHERE title IS NULL OR btrim(title) = '';
UPDATE public.announcements SET type = 'Info' WHERE type IS NULL OR btrim(type) = '';

ALTER TABLE public.announcements ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN type SET NOT NULL;
