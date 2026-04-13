/**
 * Creates (or resets) the seeded secondary admin using the Supabase Admin API.
 * This avoids SQL bcrypt / auth.identities mismatches that cause "Invalid login credentials".
 *
 * Add to your .env (same folder as package.json):
 *   VITE_SUPABASE_URL=...           (you already have this)
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Dashboard → Settings → API → service_role — never expose in frontend)
 *
 * Run: npm run seed:admin
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEED_EMAIL = 'seed_admin2@smartcsm.dev';
const SEED_PASSWORD = 'SmartCSM_Seed_Admin2!';
const SEED_NAME = 'Seed Admin Two';
const SEED_ACCOUNT = 'PW-SEED-ADMIN2-0002';

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || '').toLowerCase() === target);
    if (u) return u;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      'Missing VITE_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env'
    );
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await findUserByEmail(admin, SEED_EMAIL);
  if (existing) {
    const { error: delErr } = await admin.auth.admin.deleteUser(existing.id);
    if (delErr) throw delErr;
    console.log('Removed existing auth user for', SEED_EMAIL);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: SEED_NAME },
  });

  if (error) throw error;

  const id = data.user.id;

  const { error: pErr } = await admin.from('profiles').upsert(
    {
      id,
      full_name: SEED_NAME,
      role: 'admin',
      email: SEED_EMAIL,
      account_no: SEED_ACCOUNT,
    },
    { onConflict: 'id' }
  );

  if (pErr) {
    console.error('Profile upsert failed (user was created; fix RLS or columns):', pErr.message);
    process.exit(1);
  }

  console.log('Seeded admin is ready.');
  console.log('  Email:   ', SEED_EMAIL);
  console.log('  Password:', SEED_PASSWORD);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
