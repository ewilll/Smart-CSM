-- Run this in Supabase → SQL Editor on a NEW or empty project BEFORE seed:admin
-- and before other migrations that ALTER public.profiles.
--
-- Fixes: "Could not find the table 'public.profiles' in the schema cache"

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    barangay TEXT,
    address TEXT,
    account_no TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    avatar_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_account_no ON public.profiles (account_no);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Minimal RLS so the app can read/insert/update the signed-in user’s row (matches backend_migration intent)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
