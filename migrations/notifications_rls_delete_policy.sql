-- Allow users to delete their own notification rows (header dropdown "Delete").
-- Run in Supabase SQL Editor if deletes from the app fail with RLS errors.

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
