-- Optional: fix "NULL value in column subject of relation announcements violates not-null constraint"
-- when the app sends `title` but an older table still has NOT NULL `subject` without a default.
-- Run in Supabase SQL Editor for that project only if you see that error on Publish Alert.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'subject'
  ) THEN
    UPDATE public.announcements
    SET subject = COALESCE(NULLIF(btrim(subject), ''), btrim(COALESCE(title, '')))
    WHERE subject IS NULL OR btrim(COALESCE(subject, '')) = '';

    ALTER TABLE public.announcements ALTER COLUMN subject DROP NOT NULL;

    -- Optional default for any legacy client that still omits subject
    ALTER TABLE public.announcements ALTER COLUMN subject SET DEFAULT '';
  END IF;
END $$;
