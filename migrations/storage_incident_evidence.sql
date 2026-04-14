-- Incident photo evidence: Supabase Storage bucket + policies.
-- Run in Supabase SQL Editor after auth/profiles exist.
-- Frontend uploads to path: {user_id}/{incident_id}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'incident-evidence',
    'incident-evidence',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Public read (getPublicUrl); tighten later if you need private evidence + signed URLs only.
DROP POLICY IF EXISTS "Public read incident evidence" ON storage.objects;
CREATE POLICY "Public read incident evidence"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'incident-evidence');

DROP POLICY IF EXISTS "Users upload incident evidence own folder" ON storage.objects;
CREATE POLICY "Users upload incident evidence own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'incident-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users update incident evidence own folder" ON storage.objects;
CREATE POLICY "Users update incident evidence own folder"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'incident-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'incident-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users delete incident evidence own folder" ON storage.objects;
CREATE POLICY "Users delete incident evidence own folder"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'incident-evidence'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admins: manage any object in bucket (optional; requires profiles.role = 'admin')
DROP POLICY IF EXISTS "Admins manage incident evidence" ON storage.objects;
CREATE POLICY "Admins manage incident evidence"
    ON storage.objects FOR ALL TO authenticated
    USING (
        bucket_id = 'incident-evidence'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        bucket_id = 'incident-evidence'
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
