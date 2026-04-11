-- PrimeWater Smart CSM: Backend Security Migration
-- This script sets up the Audit Log table and Row-Level Security (RLS) policies.

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_user_id UUID,
    details TEXT,
    ip_address TEXT
);

-- Enable RLS on Audit Logs (Admin Only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' );

-- 2. PROFILES SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING ( auth.uid() = id );

-- Users can create their own profile during first login (Self-Healing)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK ( auth.uid() = id );

-- Users can update their own profile info
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING ( auth.uid() = id )
    WITH CHECK ( auth.uid() = id );

-- Admins can view all profiles (Non-recursive check using JWT email)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'akazayasussy@gmail.com' );

-- Only admins can update user roles
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'akazayasussy@gmail.com' )
    WITH CHECK ( (auth.jwt() ->> 'email') = 'akazayasussy@gmail.com' );

-- 3. INCIDENTS SECURITY
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Residents can see their own incidents
DROP POLICY IF EXISTS "Users can see own incidents" ON incidents;
CREATE POLICY "Users can see own incidents" ON incidents
    FOR SELECT TO authenticated
    USING ( user_id = auth.uid() );

-- Admins can see everything
DROP POLICY IF EXISTS "Admins can see all incidents" ON incidents;
CREATE POLICY "Admins can see all incidents" ON incidents
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' );

-- 4. BILLS SECURITY
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Residents can see their own bills
DROP POLICY IF EXISTS "Users can see own bills" ON bills;
CREATE POLICY "Users can see own bills" ON bills
    FOR SELECT TO authenticated
    USING ( user_id = auth.uid() );

-- Admins can manage all bills
DROP POLICY IF EXISTS "Admins can manage all bills" ON bills;
CREATE POLICY "Admins can manage all bills" ON bills
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' );

-- IMPORTANT: Make sure your Supabase Auth Users have a 'role' metadata field 
-- or use a custom 'role' column in your profiles table for these checks to work.
