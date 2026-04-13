-- Migration: Create missing tables for Smart CSM
-- Run this in the Supabase SQL Editor

-- 1. Announcements table (used by GlobalTicker and AdminDashboard)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Info', -- 'Emergency' | 'Maintenance' | 'Info'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active announcements (public ticker)
CREATE POLICY "Anyone can read announcements" ON public.announcements
    FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- 2. System settings table (used by AdminDashboard for AI config)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read settings" ON public.system_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can write settings
CREATE POLICY "Admins can manage settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default AI config
INSERT INTO public.system_settings (key, value) VALUES (
    'ai_config',
    '{"mascotName": "Aqua", "welcomeMessage": "Hello! I am Aqua, your PrimeWater assistant. How can I help you today?", "isMaintenance": false}'::JSONB
) ON CONFLICT (key) DO NOTHING;
