import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://szmwawvfejodcjylxtmc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── NEW ADMIN CREDENTIALS ───────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin2@primewater.com';
const ADMIN_PASSWORD = 'PrimeWater@2024';
const ADMIN_NAME     = 'Admin';
const ACCOUNT_NUMBER = 'ADMIN002';
// ─────────────────────────────────────────────────────────────────────────────

async function createAdmin() {
  console.log('Creating new admin account...\n');

  // 1. Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.error('❌ Failed to create auth user:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created: ${userId}`);

  // 2. Insert the profile with role = 'admin'
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email: ADMIN_EMAIL,
    first_name: ADMIN_NAME,
    last_name: 'Account',
    full_name: `${ADMIN_NAME} Account`,
    account_no: ACCOUNT_NUMBER,
    role: 'admin',
    barangay: 'N/A'
  });

  if (profileError) {
    console.error('❌ Failed to create profile:', profileError.message);
    console.log('ℹ️  Auth user was created but profile failed. You may need to insert the profile manually.');
    process.exit(1);
  }

  console.log(`✅ Profile created with role: admin\n`);
  console.log('═══════════════════════════════════════');
  console.log('  NEW ADMIN ACCOUNT CREDENTIALS');
  console.log('═══════════════════════════════════════');
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log(`  Role     : admin`);
  console.log('═══════════════════════════════════════\n');
  console.log('You can change the email/password in the .env or in Supabase Auth dashboard.');
}

createAdmin();
