-- Audit log table for admin actions (e.g. profile updates, optional DB triggers on announcements).
-- Fixes: relation "public.audit_logs" does not exist (often seen when publishing advisories if a trigger logs here).
-- Run once in Supabase SQL Editor (same project as VITE_SUPABASE_URL).

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    admin_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    details TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs (admin_id);

COMMENT ON TABLE public.audit_logs IS 'Append-only admin audit trail; optional triggers may write here.';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins (profiles.role = admin) can read all rows
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Admins can insert; require admin_id to match caller (prevents forged actor id)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        AND admin_id = auth.uid()
    );

-- Optional: drop legacy policy name from backend_migration.sql if it was applied
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Realtime (System Audit page subscribes to this table)
DO $pub$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END
$pub$;
