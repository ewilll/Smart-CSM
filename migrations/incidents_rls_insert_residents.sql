-- Residents must be able to INSERT their own rows (Report Incident page).
-- Prerequisite: public.incidents must exist — run create_incidents_table.sql first
-- (that file creates the table and already includes this policy).
--
-- Use this file only on databases that already had incidents + RLS from
-- backend_migration.sql but were missing the INSERT policy.

DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
CREATE POLICY "Users can insert own incidents" ON public.incidents
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
