-- PrimeWater Smart CSM: Account Number Integration
-- This script adds the account_no column to the profiles table
-- and seeds it with a default pattern if missing.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_no TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_no ON public.profiles(account_no);

-- Seed existing users with a mock account number if they don't have one
-- Pattern: PW-USERID_SHORT
UPDATE public.profiles
SET account_no = 'PW-' || upper(substring(id::text from 1 for 8))
WHERE account_no IS NULL OR account_no = '';
