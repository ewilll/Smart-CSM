
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Manual config since we are running via node
const supabaseUrl = 'https://meocydukqbkpnzfdvhuw.supabase.co';
const supabaseKey = 'sb_publishable_3cGXVjH0ehu4qBljYMSI0Q_Sr0hqNby';

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToAdmin() {
    const email = 'mylesselwyn@gmail.com';
    const password = 'selwynmyles123'; // Captured from screenshot 
    console.log(`Logging in as: ${email}...`);

    // 1. Sign In to get User ID
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login failed:', loginError.message);
        return;
    }

    const userId = authData.user.id;
    console.log(`Login successful! User ID: ${userId}`);

    // 2. Update Role
    console.log(`Attempting to promote user to 'admin'...`);
    const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select();

    if (updateError) {
        console.error('Error updating role:', updateError);
        console.log("FAILED: RLS likely prevents updating 'role'.");
    } else {
        console.log('Success! User promoted to admin.');
        console.log(updateData);
    }
}

promoteToAdmin();
