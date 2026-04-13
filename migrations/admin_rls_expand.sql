-- Expand admin checks from a single hard-coded email to any user with profiles.role = 'admin'.
-- Run this in the Supabase SQL Editor (or via CLI) before or after the seed admin script.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Profiles: any admin can read/update all rows (needed for dashboard user management)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING ( public.is_admin() )
    WITH CHECK ( public.is_admin() );

-- Announcements / messages: same pattern (only if those tables exist — run
-- communications_migration.sql or create_missing_tables.sql first if you need them).

DO $announce$
BEGIN
  IF to_regclass('public.announcements') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
    CREATE POLICY "Admins can manage announcements" ON public.announcements
        FOR ALL TO authenticated
        USING ( public.is_admin() );
  END IF;
END $announce$;

DO $msg$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
    CREATE POLICY "Admins can view all messages" ON public.messages
        FOR ALL TO authenticated
        USING ( public.is_admin() );
  END IF;
END $msg$;
