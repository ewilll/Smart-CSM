-- Create public.incidents (required before incidents_rls_insert_residents.sql and incident_priority_score.sql).
-- Run in Supabase SQL Editor once per project.

CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    type TEXT NOT NULL DEFAULT 'Pipe Leakage',
    location TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Pending',
    priority_score INTEGER NOT NULL DEFAULT 5,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    user_name TEXT,
    contact_number TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    evidence_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_user_created
    ON public.incidents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_priority_active
    ON public.incidents (priority_score DESC, created_at ASC)
    WHERE status IS DISTINCT FROM 'Resolved' AND status IS DISTINCT FROM 'Declined';

COMMENT ON TABLE public.incidents IS 'Resident-reported service incidents (maps, admin queue, public log).';

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Public feed (PublicLog / ServiceMap use anon or authenticated client without user-scoped filter)
DROP POLICY IF EXISTS "Anyone can read incidents for public log" ON public.incidents;
CREATE POLICY "Anyone can read incidents for public log" ON public.incidents
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can see own incidents" ON public.incidents;
CREATE POLICY "Users can see own incidents" ON public.incidents
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can see all incidents" ON public.incidents;
CREATE POLICY "Admins can see all incidents" ON public.incidents
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
CREATE POLICY "Users can insert own incidents" ON public.incidents
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Realtime (safe if already added)
DO $pub$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- publication name differs on non-standard installs
    WHEN duplicate_object THEN
        NULL; -- table already in publication
END
$pub$;
