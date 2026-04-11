-- PrimeWater Smart CSM: System Settings Migration
-- This script creates the system_settings table and seeds the default AI configuration.

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;
CREATE POLICY "Anyone can view system settings" ON system_settings
    FOR SELECT TO authenticated
    USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL TO authenticated
    USING ( (auth.jwt() ->> 'role') = 'admin' );

-- Seed default AI Config if it doesn't exist
INSERT INTO public.system_settings (key, value)
VALUES ('ai_config', '{
    "mascotName": "Aqua",
    "welcomeMessage": "Hello! I am Aqua, your PrimeWater assistant. How can I help you today?",
    "isMaintenance": false
}')
ON CONFLICT (key) DO NOTHING;
