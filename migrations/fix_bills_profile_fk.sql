-- Add foreign key from bills.user_id to profiles.id so that
-- the Supabase PostgREST join `bills.select('*, profiles(full_name)')` works.
-- Run this in Supabase SQL Editor.

-- Only add if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'bills_user_id_profiles_fk'
          AND table_name = 'bills'
    ) THEN
        ALTER TABLE public.bills
            ADD CONSTRAINT bills_user_id_profiles_fk
            FOREIGN KEY (user_id) REFERENCES public.profiles(id)
            ON DELETE CASCADE;
    END IF;
END $$;
