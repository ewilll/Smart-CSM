import { supabase } from './supabaseClient';

const oauthRedirectBase = () =>
    typeof window !== 'undefined' ? window.location.origin : '';

/**
 * Turns Supabase cryptic errors into actionable text for the UI.
 */
export function formatAuthErrorMessage(raw) {
    const msg = String(raw || '').trim();
    if (!msg) return 'Something went wrong. Please try again.';

    const lower = msg.toLowerCase();

    if (lower.includes('email rate limit') || lower.includes('rate limit')) {
        return (
            'Supabase has temporarily limited sign-up emails for this project. ' +
            'Wait about an hour, try a different email, or (for local testing) turn off “Confirm email” in Supabase: ' +
            'Authentication → Providers → Email → disable “Confirm email”.'
        );
    }

    if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
        return (
            'Google sign-in is turned off in Supabase. Open your project → Authentication → Providers → Google, ' +
            'enable it, and paste your Google Cloud “Web application” Client ID and Client secret. ' +
            'In Google Cloud, add the Supabase callback URL to Authorized redirect URIs.'
        );
    }

    if (lower.includes('invalid api key')) {
        return (
            'Supabase rejected the browser API key. In the dashboard go to Project Settings → API Keys, ' +
            'copy the full Publishable key (new) or the legacy anon key (starts with eyJ) into VITE_SUPABASE_ANON_KEY. ' +
            'It must be from the same project as VITE_SUPABASE_URL. Do not use the secret/service key in the frontend. ' +
            'Restart npm run dev after changing .env.'
        );
    }

    if (lower.includes('email not confirmed')) {
        return (
            'This email is not confirmed yet. Open the link in your sign-up email, or in Supabase go to ' +
            'Authentication → Users → select the user → Confirm email. For local testing you can disable ' +
            '“Confirm email” under Authentication → Providers → Email.'
        );
    }

    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
        return (
            'Wrong email or password — or there is no Auth user with this email in the Supabase project ' +
            'that matches VITE_SUPABASE_URL. Check Authentication → Users in that project. To create/promote ' +
            'an admin from .env, run: node scripts/seed_admin.mjs (from the Smart-CSM folder).'
        );
    }

    if (lower.includes('user already registered') || lower.includes('already been registered')) {
        return 'This email is already registered. Try signing in instead.';
    }

    if (
        lower.includes('error sending') ||
        lower.includes('sending confirmation email') ||
        lower.includes('unable to send') ||
        lower.includes('email could not be sent') ||
        lower.includes('smtp')
    ) {
        return (
            'Supabase could not send the email (SMTP or provider issue). In the dashboard: Project Settings → Auth → ' +
            'SMTP Settings — set a custom SMTP, or check Logs → Auth. Free-tier mail often lands in Spam. ' +
            'For development you can disable “Confirm email” under Authentication → Providers → Email.'
        );
    }

    return msg;
}

/**
 * Build localStorage session from Supabase session + profiles row.
 * Required after email/password sign-up so ProtectedRoute (localStorage) works.
 */
export const syncUserSessionFromSupabase = async () => {
    const { data: { session }, error: sessErr } = await supabase.auth.getSession();
    if (sessErr || !session?.user) {
        return { success: false, message: sessErr?.message || 'No active session' };
    }
    const u = session.user;
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

    if (profileError) {
        console.warn('syncUserSessionFromSupabase profile:', profileError.message);
    }

    const sessionUser = {
        id: u.id,
        email: u.email,
        name: profile?.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
        role: profile?.role || 'customer',
        avatar_url: profile?.avatar_url,
        phone: profile?.phone,
        account_no: profile?.account_no || `PW-${u.id.slice(0, 8).toUpperCase()}`,
        createdAt: u.created_at,
    };
    localStorage.setItem('smart_csm_current_user', JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
};

/**
 * Sign in with Google using Supabase OAuth
 */
export const signInWithGoogle = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${oauthRedirectBase()}/`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account',
                },
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;
        if (data?.url) {
            window.location.assign(data.url);
            return { success: true, data };
        }
        return { success: false, message: 'No OAuth URL returned. Enable Google in Supabase Auth → Providers and add this site URL to Redirect URLs.' };
    } catch (error) {
        return { success: false, message: formatAuthErrorMessage(error.message) };
    }
};

/**
 * Build display full name from structured signup fields (middle initial optional).
 */
export function buildSignUpFullName(firstName, middleInitial, lastName) {
    const f = String(firstName || '').trim();
    const l = String(lastName || '').trim();
    const raw = String(middleInitial || '').trim();
    let mid = '';
    if (raw.length === 1) {
        mid = `${raw.toUpperCase()}.`;
    } else if (raw.length > 1) {
        mid = raw.endsWith('.') ? raw : raw;
    }
    const parts = mid ? [f, mid, l] : [f, l];
    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Register a new user with Supabase Auth and create a profile
 * @param {object} userData - expects firstName, lastName, optional middleInitial (not name)
 */
export const registerUser = async (userData) => {
    try {
        const firstName = String(userData.firstName ?? '').trim();
        const lastName = String(userData.lastName ?? '').trim();
        const middleInitial = String(userData.middleInitial ?? '').trim();
        const emailTrimmed = String(userData.email ?? '').trim();

        if (!firstName || !lastName) {
            return { success: false, message: 'First name and last name are required.' };
        }
        if (!emailTrimmed || !emailTrimmed.includes('@')) {
            return { success: false, message: 'Please enter a valid email address.' };
        }

        const displayFullName = buildSignUpFullName(firstName, middleInitial, lastName);

        const signUpPayload = {
            email: emailTrimmed,
            password: userData.password,
            options: {
                emailRedirectTo: `${oauthRedirectBase()}/login`,
                data: {
                    full_name: displayFullName,
                    first_name: firstName,
                    last_name: lastName,
                    middle_initial: middleInitial || '',
                    role: userData.role || 'customer',
                    phone: userData.phone || '',
                    barangay: userData.barangay || '',
                },
            },
        };
        const siteOrigin = oauthRedirectBase();
        // Only send captcha when present — undefined breaks some Supabase / captcha configs
        if (userData.captchaToken) {
            signUpPayload.options.captchaToken = userData.captchaToken;
        }

        const { data: authData, error: authError } = await supabase.auth.signUp(signUpPayload);

        if (authError) throw authError;

        const user = authData.user;
        const session = authData.session;

        if (!user) {
            return { success: false, message: 'Sign up did not return a user. Check Supabase Auth settings.' };
        }

        // Supabase hides duplicate sign-ups: user object exists but identities is empty — no account, no email.
        const identities = user.identities;
        if (Array.isArray(identities) && identities.length === 0) {
            return {
                success: false,
                message: 'This email is already registered. Try signing in instead.',
            };
        }

        // Email confirmation enabled → no session yet → cannot INSERT profiles from browser (RLS needs auth.uid())
        if (!session) {
            import('./notifyService.js')
                .then((m) =>
                    m.sendSignupRelatedEmail({
                        to: emailTrimmed,
                        kind: 'pending_confirmation',
                        displayName: displayFullName,
                        siteOrigin,
                    })
                )
                .catch(() => {});
            return {
                success: true,
                user,
                needsEmailConfirmation: true,
            };
        }

        const { error: profileError } = await supabase.from('profiles').insert([
            {
                id: user.id,
                full_name: displayFullName,
                first_name: firstName,
                last_name: lastName,
                role: userData.role || 'customer',
                email: emailTrimmed,
                phone: userData.phone,
                barangay: userData.barangay,
                account_no: `PW-${firstName.replace(/\s+/g, '').toUpperCase().slice(0, 12) || 'NEW'}-${Math.floor(1000 + Math.random() * 9000)}`,
            },
        ]);

        if (profileError && profileError.code !== '23505') {
            console.warn('Profile insert (non-fatal if trigger exists):', profileError.message);
        }

        const sync = await syncUserSessionFromSupabase();
        if (!sync.success) {
            console.warn('Session sync after sign up:', sync.message);
        }

        import('./notifyService.js')
            .then((m) =>
                m.sendSignupRelatedEmail({
                    to: emailTrimmed,
                    kind: 'welcome',
                    displayName: displayFullName,
                    siteOrigin,
                })
            )
            .catch(() => {});

        return { success: true, user, needsEmailConfirmation: false };
    } catch (error) {
        console.error('Registration Error:', error);
        return { success: false, message: formatAuthErrorMessage(error.message) };
    }
};

/**
 * Ask Supabase to send the sign-up confirmation email again (same redirect as registerUser).
 * Use when the user created an account but did not receive the first message.
 */
export const resendSignupConfirmationEmail = async (email) => {
    try {
        const emailTrimmed = String(email || '').trim();
        if (!emailTrimmed) {
            return { success: false, message: 'Please enter the email you signed up with.' };
        }
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: emailTrimmed,
            options: {
                emailRedirectTo: `${oauthRedirectBase()}/login`,
            },
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, message: formatAuthErrorMessage(error.message) };
    }
};

/**
 * Login user using Supabase Auth
 */
export const loginUser = async (email, password) => {
    try {
        const emailTrimmed = String(email || '').trim();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: emailTrimmed,
            password,
        });

        if (authError) throw authError;

        const sync = await syncUserSessionFromSupabase();
        if (!sync.success) {
            throw new Error(sync.message || 'Could not load session');
        }
        return { success: true, user: sync.user };
    } catch (error) {
        return { success: false, message: formatAuthErrorMessage(error.message) };
    }
};

/**
 * Get current logged in user
 */
export const getCurrentUser = () => {
    const user = localStorage.getItem('smart_csm_current_user');
    return user ? JSON.parse(user) : null;
};

/**
 * Logout user
 */
export const logoutUser = async () => {
    try {
        // Only attempt sign out if there's an active session to avoid errors
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
            await supabase.auth.signOut();
        }
    } catch (err) {
        console.warn("Sign out network error (silenced):", err);
    }
    // Always clear local storage regardless of network success
    localStorage.removeItem('smart_csm_current_user');
    localStorage.removeItem('smart_csm_auth_intent');
    localStorage.removeItem('smart_csm_pending_role');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    return getCurrentUser() !== null;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email) => {
    try {
        const emailTrimmed = String(email || '').trim();
        if (!emailTrimmed) {
            return { success: false, message: 'Please enter your email address.' };
        }
        const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
            redirectTo: `${oauthRedirectBase()}/login`,
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, message: formatAuthErrorMessage(error.message) };
    }
};

/**
 * Update user profile in Supabase
 */
export const updateUserProfile = async (userId, updates) => {
    try {
        const updateData = {
            full_name: updates.lastName && updates.firstName
                ? `${updates.lastName}, ${updates.firstName}`
                : (updates.name || updates.full_name),
            role: updates.role,
            barangay: updates.barangay,
            first_name: updates.firstName,
            last_name: updates.lastName
        };

        if (updates.avatar_url) updateData.avatar_url = updates.avatar_url;
        if (updates.phone) updateData.phone = updates.phone;

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        // Update current user session if it's the logged in user
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            const updatedSessionUser = {
                ...currentUser,
                name: data.full_name,
                firstName: data.first_name,
                lastName: data.last_name,
                barangay: data.barangay,
                role: data.role,
                avatar_url: data.avatar_url || currentUser.avatar_url,
                phone: data.phone || currentUser.phone,
                account_no: data.account_no || currentUser.account_no
            };
            localStorage.setItem('smart_csm_current_user', JSON.stringify(updatedSessionUser));
            return { success: true, user: updatedSessionUser };
        }

        return { success: true, user: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Deactivate user (delete profile and logout)
 */
export const deactivateUser = async (userId) => {
    try {
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) throw profileError;

        // Logout after deletion
        await logoutUser();
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
