import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Supabase URL or Anon Key is missing. Ensure Smart-CSM/.env defines VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the Vite dev server (npm run dev).'
    )
} else if (String(supabaseAnonKey).startsWith('sb_secret_')) {
    console.error(
        'VITE_SUPABASE_ANON_KEY looks like a secret key (sb_secret_). Use the Publishable / anon key only; never put sb_secret_ in Vite env.'
    )
}

/** PKCE + URL detection required for Google OAuth redirect back to the SPA */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
})
