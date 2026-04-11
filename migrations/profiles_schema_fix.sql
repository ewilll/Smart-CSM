-- Add missing columns to 'profiles' table for enhanced profile management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS barangay TEXT;

-- Refresh the schema cache manually if needed (Supabase usually handles this)
-- But the columns above ensure the application won't crash when updating these fields.

-- Optional: Migrate existing full_name to first/last if empty
UPDATE public.profiles
SET 
    first_name = split_part(full_name, ' ', 1),
    last_name = substring(full_name from position(' ' in full_name) + 1)
WHERE (first_name IS NULL OR first_name = '') AND full_name IS NOT NULL;
