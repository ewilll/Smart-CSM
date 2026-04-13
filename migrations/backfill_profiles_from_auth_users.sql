-- Smart-CSM: Create missing public.profiles rows from auth.users (one-time maintenance).
-- Run in Supabase → SQL Editor.
--
-- When to use:
--   • Authentication → Users shows accounts (e.g. edo molatch, zeldrex escoobar)
--   • Table Editor → public.profiles has fewer rows — sign-up with "confirm email"
--     often skips the browser-side profile insert, so no row exists until first login.
--
-- Before this, ensure admins can read all profiles (otherwise the admin UI still looks empty):
--   Run migrations/admin_rls_expand.sql (is_admin() policies) if you still use the old
--   hard-coded email check from migrations/backend_migration.sql.

INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role, phone, barangay, account_no, created_at)
SELECT
  s.id,
  s.email,
  s.fn AS full_name,
  NULLIF(trim(split_part(s.fn, ' ', 1)), '') AS first_name,
  NULLIF(
    trim(substring(s.fn from length(split_part(s.fn, ' ', 1)) + 2)),
    ''
  ) AS last_name,
  'customer'::text AS role,
  NULLIF(trim(s.meta_phone), ''),
  NULLIF(trim(s.meta_barangay), ''),
  'PW-' || upper(left(replace(s.id::text, '-', ''), 8)),
  COALESCE(s.created_at, now())
FROM (
  SELECT
    au.id,
    au.email,
    au.created_at,
    trim(au.raw_user_meta_data->>'phone') AS meta_phone,
    trim(au.raw_user_meta_data->>'barangay') AS meta_barangay,
    COALESCE(
      NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
      initcap(replace(split_part(au.email, '@', 1), '.', ' ')),
      'Resident'
    ) AS fn
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
    AND au.email IS NOT NULL
) s;

-- Optional: inspect how many rows were missing before/after:
-- SELECT count(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);
