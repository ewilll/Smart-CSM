-- =============================================================================
-- Secondary seeded admin (Supabase Auth + public.profiles)
-- =============================================================================
-- Prefer the Node seeder (uses Admin API; passwords match GoTrue):
--   1. Add SUPABASE_SERVICE_ROLE_KEY to .env (Dashboard → Settings → API).
--   2. npm run seed:admin
--
-- This SQL file can still fail login on some hosted projects (bcrypt /
-- auth.identities shape). If you used SQL and see "Invalid login credentials",
-- delete the user in Dashboard → Authentication, then run npm run seed:admin.
--
-- LOGIN (dev / seed only):
--   Email:    seed_admin2@smartcsm.dev
--   Password: SmartCSM_Seed_Admin2!
--
-- Also run migrations/admin_rls_expand.sql so this admin can manage
-- announcements and messages (old policies only allowed the boss email).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id uuid := 'a2ee0000-0000-4000-8000-000000000002'::uuid;
  v_email   text := 'seed_admin2@smartcsm.dev';
  v_pw      text := 'SmartCSM_Seed_Admin2!';
  v_hash    text := crypt(v_pw, gen_salt('bf'));
BEGIN
  DELETE FROM auth.identities WHERE user_id = v_user_id;
  DELETE FROM public.profiles   WHERE id = v_user_id;
  DELETE FROM auth.users        WHERE id = v_user_id;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_hash,
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Seed Admin Two'),
    NULL,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    email,
    account_no
  ) VALUES (
    v_user_id,
    'Seed Admin Two',
    'admin',
    v_email,
    'PW-SEED-ADMIN2-0002'
  );
END $$;
