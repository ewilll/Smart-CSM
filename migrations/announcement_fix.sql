-- 1. Create the announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Maintenance', -- 'Maintenance', 'Emergency', 'System'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow anyone (authenticated or anonymous) to view active announcements
CREATE POLICY "Anyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (is_active = true);

-- Allow admins to do everything
CREATE POLICY "Admins have full access to announcements" 
ON public.announcements 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 4. Enable Real-time for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- 5. Insert a test announcement (optional)
INSERT INTO public.announcements (title, content, type) 
VALUES ('System Update', 'Database schema has been synchronized. You can now post announcements from the Admin Dashboard.', 'System');
