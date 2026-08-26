import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key in .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
    try {
        console.log('Checking if "evidence" bucket exists...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            throw new Error(`Failed to list buckets: ${bucketsError.message}`);
        }

        const evidenceBucketExists = buckets.some(b => b.name === 'evidence');

        if (!evidenceBucketExists) {
            console.log('Creating "evidence" bucket...');
            const { error: createError } = await supabase.storage.createBucket('evidence', {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                fileSizeLimit: 5242880 // 5MB
            });

            if (createError) {
                throw new Error(`Failed to create bucket: ${createError.message}`);
            }
            console.log('Successfully created "evidence" bucket with public access!');
        } else {
            console.log('"evidence" bucket already exists. Ensuring it is public...');
            const { error: updateError } = await supabase.storage.updateBucket('evidence', {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                fileSizeLimit: 5242880 // 5MB
            });
            
            if (updateError) {
                console.warn(`Could not update bucket settings (might already be configured): ${updateError.message}`);
            } else {
                console.log('Bucket updated successfully.');
            }
        }
        
        console.log('Storage setup complete!');
    } catch (err) {
        console.error('Error during setup:', err.message);
        process.exit(1);
    }
}

setupStorage();
