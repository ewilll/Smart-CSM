-- Bills table for admin-generated water bills (resident Bills page, admin Billing tab).
-- Fixes: "Could not find the table 'public.bills' in the schema cache"
-- Run once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    account_no TEXT NOT NULL,
    address TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    consumption NUMERIC(12, 3) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    reading_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Paid', 'Overdue'))
);

CREATE INDEX IF NOT EXISTS idx_bills_user_created ON public.bills (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills (status);

COMMENT ON TABLE public.bills IS 'Water bills issued to residents; rows from admin dashboard.';

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Residents can read own bills" ON public.bills;
CREATE POLICY "Residents can read own bills"
    ON public.bills
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all bills" ON public.bills;
CREATE POLICY "Admins can manage all bills"
    ON public.bills
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

DO $pub$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN duplicate_object THEN NULL;
END
$pub$;
