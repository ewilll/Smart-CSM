-- Fix: "new row violates row-level security policy for table announcements"
-- when publishing from another device or another admin Google account.
--
-- Older communications_migration.sql used a single hard-coded JWT email for
-- INSERT/UPDATE. Replace those policies with the same rule as the app expects:
-- any authenticated user whose public.profiles row has role = 'admin'.
--
-- Run once in Supabase → SQL Editor (same project as VITE_SUPABASE_URL).

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Same pattern for support messages if that table exists.
DO $fix$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
    CREATE POLICY "Admins can view all messages" ON public.messages
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );
  END IF;
END $fix$;
