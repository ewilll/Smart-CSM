-- Smart-CSM: Copy phone / barangay from auth.users.raw_user_meta_data into public.profiles
-- when the profile row is missing those fields (e.g. self-heal only saved full_name).
-- Run once in Supabase → SQL Editor after sign-up metadata includes `phone` / `barangay`
-- (see client signUp → auth options.data).

UPDATE public.profiles p
SET
  phone = COALESCE(NULLIF(trim(p.phone), ''), NULLIF(trim(au.raw_user_meta_data->>'phone'), '')),
  barangay = COALESCE(NULLIF(trim(p.barangay), ''), NULLIF(trim(au.raw_user_meta_data->>'barangay'), ''))
FROM auth.users au
WHERE au.id = p.id
  AND (
    (p.phone IS NULL OR trim(p.phone) = '')
    OR (p.barangay IS NULL OR trim(p.barangay) = '')
  );

-- Fill first_name / last_name from full_name when those columns are empty (admin UI expects them).
UPDATE public.profiles p
SET
  first_name = NULLIF(trim(split_part(trim(p.full_name), ' ', 1)), ''),
  last_name = NULLIF(
    trim(substring(trim(p.full_name) from length(split_part(trim(p.full_name), ' ', 1)) + 2)),
    ''
  )
WHERE (p.first_name IS NULL OR trim(p.first_name) = '')
  AND (p.last_name IS NULL OR trim(p.last_name) = '')
  AND p.full_name IS NOT NULL
  AND trim(p.full_name) <> ''
  AND position(' ' in trim(p.full_name)) > 0;
