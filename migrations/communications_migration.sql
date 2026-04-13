-- PrimeWater Smart CSM: Real-time Communications Migration
-- This script sets up the tables for Announcements and 1-to-1 Support Messaging.

-- 1. ANNOUNCEMENTS TABLE (City-wide alerts)
-- Columns must match the Vite app: title, content, type, is_active (see AdminDashboard.jsx).
-- If you already created this table with subject/category, run announcements_schema_align.sql once.
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Emergency',
    is_active BOOLEAN DEFAULT true,
    sender TEXT DEFAULT 'PrimeWater Admin',
    expires_at TIMESTAMPTZ
);

-- Enable RLS on Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can view active announcements
DROP POLICY IF EXISTS "Anyone can view active announcements" ON announcements;
CREATE POLICY "Anyone can view active announcements" ON announcements
    FOR SELECT TO authenticated
    USING ( is_active = true );

-- Only admins can manage announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" ON announcements
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'akazayasussy@gmail.com' );

-- 2. MESSAGES TABLE (1-to-1 Support Communication)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    sender_id UUID REFERENCES auth.users(id),
    recipient_id UUID REFERENCES auth.users(id),
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'Support Tickets', -- 'Support Tickets', 'Billing', 'General'
    related_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL
);

-- Enable RLS on Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages where they are the sender or recipient
DROP POLICY IF EXISTS "Users can see their own messages" ON messages;
CREATE POLICY "Users can see their own messages" ON messages
    FOR SELECT TO authenticated
    USING ( auth.uid() = sender_id OR auth.uid() = recipient_id );

-- Users can send messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT TO authenticated
    WITH CHECK ( auth.uid() = sender_id );

-- Admins can view and manage all support messages
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'email') = 'akazayasussy@gmail.com' );

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
