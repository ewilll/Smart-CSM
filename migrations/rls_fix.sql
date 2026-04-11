-- PrimeWater Smart CSM: RLS Relaxing for Public Access
-- This script allows anonymous users to read system settings (for AI mascot)
-- and expands profile access for high-fidelity cross-references.

-- Allow anyone to read system settings (essential for chatbot initialization)
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;
CREATE POLICY "Anyone can view system settings" ON system_settings
    FOR SELECT USING (true);

-- Ensure profiles can be read by authenticated users for lookups in bills/incidents
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT TO authenticated
    USING (true);
