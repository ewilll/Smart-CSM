-- Fix: Admin cannot update incident status because the old RLS policy
-- checks (auth.jwt() ->> 'role') = 'admin' which doesn't match Supabase JWT structure.
-- Replace with is_admin() function that checks profiles.role instead.
--
-- Prerequisite: admin_rls_expand.sql must have been run (creates is_admin()).
-- Run this in Supabase SQL Editor.

-- Drop the broken admin policy
DROP POLICY IF EXISTS "Admins can see all incidents" ON public.incidents;

-- Recreate with is_admin() — covers SELECT, INSERT, UPDATE, DELETE for admins
CREATE POLICY "Admins full access to incidents" ON public.incidents
    FOR ALL TO authenticated
    USING ( public.is_admin() )
    WITH CHECK ( public.is_admin() );

-- Also allow residents to UPDATE their own incidents (e.g. adding evidence)
DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
CREATE POLICY "Users can update own incidents" ON public.incidents
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
