/**
 * Creates (or promotes) an admin user in Supabase Auth + public.profiles.
 *
 * Requires the Service Role key (Settings → API in Supabase). Never expose it
 * in the browser or commit it; use only in local .env for this script.
 *
 * .env example:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...   (never use the VITE_ prefix for this key)
 *   SEED_ADMIN_EMAIL=you@example.com
 *   SEED_ADMIN_PASSWORD=your-secure-password
 *   SEED_ADMIN_NAME=Your Name   (optional)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey && !process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'Rename VITE_SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SERVICE_ROLE_KEY. The VITE_ prefix can expose secrets in the browser bundle.'
  );
}
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const fullName = process.env.SEED_ADMIN_NAME || email?.split('@')[0] || 'Admin';

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!url) die('Missing SUPABASE_URL or VITE_SUPABASE_URL in .env');
if (!serviceKey) {
  die(
    'Missing service role key. Add SUPABASE_SERVICE_ROLE_KEY to .env (Supabase → Settings → API → service_role secret). Do not use the VITE_ prefix.'
  );
}
if (!email || !password) die('Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD in .env');

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  let userId;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    const msg = createErr.message?.toLowerCase() || '';
    if (msg.includes('already been registered') || msg.includes('already exists') || createErr.status === 422) {
      userId = await findUserIdByEmail(email);
      if (!userId) die(`User exists but could not resolve id for ${email}. Check Auth users in the dashboard.`);
      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (updErr) {
        die(
          `Auth user exists but password/metadata update failed: ${updErr.message}\n` +
            'Fix SUPABASE_SERVICE_ROLE_KEY (must be the Secret / service_role key for this same project URL), then run npm run seed:admin again.'
        );
      }
      console.log(`Auth user already existed; password and metadata synced for ${email}`);
    } else {
      die(`createUser failed: ${createErr.message}`);
    }
  } else {
    userId = created.user.id;
    console.log(`Created auth user ${email}`);
  }

  const { data: existing, error: existingErr } = await supabase
    .from('profiles')
    .select('id, account_no')
    .eq('id', userId)
    .maybeSingle();

  if (existingErr) {
    const em = existingErr.message || '';
    if (em.includes('profiles') && (em.includes('schema cache') || em.includes('Could not find'))) {
      die(
        `${existingErr.message}\n` +
          'Your Supabase project is missing public.profiles. In SQL Editor run migrations/bootstrap_profiles.sql,\n' +
          'then run npm run seed:admin again.'
      );
    }
    die(`profiles lookup failed: ${existingErr.message}`);
  }

  const accountNo =
    existing?.account_no ||
    `PW-${(fullName.split(/\s+/)[0] || 'ADMIN').toUpperCase().slice(0, 12)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const row = {
    id: userId,
    email,
    full_name: fullName,
    role: 'admin',
    account_no: accountNo,
  };

  const { error: profileErr } = existing
    ? await supabase.from('profiles').update({ email, full_name: fullName, role: 'admin' }).eq('id', userId)
    : await supabase.from('profiles').insert([row]);

  if (profileErr) {
    const msg = profileErr.message || '';
    if (msg.includes('profiles') && (msg.includes('schema cache') || msg.includes('Could not find'))) {
      die(
        `profiles ${existing ? 'update' : 'insert'} failed: ${profileErr.message}\n` +
          'Your Supabase project is missing public.profiles. In the dashboard open SQL Editor, run\n' +
          'migrations/bootstrap_profiles.sql from this repo, then run npm run seed:admin again.'
      );
    }
    die(`profiles ${existing ? 'update' : 'insert'} failed: ${profileErr.message}`);
  }

  console.log(`Done. Log in at the app with ${email} (role: admin).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
