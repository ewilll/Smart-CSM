-- Delivery logs: audit trail for outbound SMS/email (httpSMS + Gmail via FastAPI).
-- Rows are written by the AI server using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- Admins read via the app (JWT); residents have no access.
-- Optional: FastAPI can apply this file on startup if SUPABASE_DB_URL is set (see server_ai/delivery_bootstrap.py).

CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
    context_type TEXT NOT NULL,
    context_id TEXT,
    recipient TEXT NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sms_body TEXT,
    email_subject TEXT,
    email_body TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    attempt_count INT NOT NULL DEFAULT 1,
    max_attempts INT NOT NULL DEFAULT 5,
    failure_reason TEXT,
    provider_detail JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_created_at ON public.delivery_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON public.delivery_logs (status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_batch ON public.delivery_logs (batch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_context ON public.delivery_logs (context_type, context_id);

ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view delivery logs" ON public.delivery_logs;
CREATE POLICY "Admins can view delivery logs"
    ON public.delivery_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- No INSERT/UPDATE/DELETE for authenticated users — only service_role (FastAPI) writes.

COMMENT ON TABLE public.delivery_logs IS 'Outbound SMS/email attempts; inserts from FastAPI with service role.';
