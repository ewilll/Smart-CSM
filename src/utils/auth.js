import { supabase } from './supabaseClient';

/**
 * Sign in with Google using Supabase OAuth
 */
export const signInWithGoogle = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Register a new user with Supabase Auth and create a profile
 */
export const registerUser = async (userData) => {
    try {
        // 1. Sign up user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.name,
                    role: userData.role || 'customer' // Storing role in metadata for redundancy
                },
                captchaToken: userData.captchaToken
            }
        });

        if (authError) throw authError;

        // 2. Create profile in 'profiles' table
        // Note: Triggers might handle this automatically if configured, but we do it manually for safety
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: userData.name,
                        role: userData.role || 'customer',
                        email: userData.email,
                        phone: userData.phone,
                        barangay: userData.barangay,
                        account_no: `PW-${userData.name?.split(' ')[0].toUpperCase() || 'NEW'}-${Math.floor(1000 + Math.random() * 9000)}`
                    }
                ]);

            if (profileError) {
                // Determine if it was a duplicate key error (user likely already created profile via trigger)
                if (profileError.code !== '23505') {
                    throw profileError;
                }
            }
        }

        return { success: true, user: authData.user };
    } catch (error) {
        console.error("Registration Error:", error);
        return { success: false, message: error.message };
    }
};

/**
 * Login user using Supabase Auth
 */
export const loginUser = async (email, password) => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw authError;

        // God Mode Removed for Production Security
        // To make a user an admin, change their role in the 'profiles' table via Supabase Dashboard.

        // Fetch profile data to get name and role
        // This might hang if RLS is strict or network is bad
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError.message);
        }

        const sessionUser = {
            id: authData.user.id,
            email: authData.user.email,
            name: profile?.full_name || authData.user.email.split('@')[0],
            role: profile?.role || 'customer',
            avatar_url: profile?.avatar_url,
            phone: profile?.phone,
            account_no: profile?.account_no || `PW-${authData.user.id.slice(0, 8).toUpperCase()}`,
            createdAt: authData.user.created_at
        };

        // Store current user session in localStorage for legacy compatibility
        localStorage.setItem('smart_csm_current_user', JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
    } catch (error) {
        return { success: false, message: error.message };
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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
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
