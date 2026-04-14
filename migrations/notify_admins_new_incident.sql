-- When a resident inserts an incident, create one in-app notification per admin profile.
-- Run in Supabase SQL Editor after: notifications_migration.sql, admin_rls_expand.sql (is_admin).
--
-- Uses SECURITY DEFINER so inserts succeed regardless of client RLS on notifications.

CREATE OR REPLACE FUNCTION public.notify_admins_new_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
BEGIN
  msg := format(
    'Priority %s: %s — %s',
    COALESCE(NEW.priority_score::text, '?'),
    COALESCE(NEW.type, 'Incident'),
    left(COALESCE(NEW.location, ''), 120)
  );

  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT p.id, 'admin', 'New incident report', msg
  FROM public.profiles p
  WHERE p.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_incident_created_notify_admins ON public.incidents;
CREATE TRIGGER on_incident_created_notify_admins
  AFTER INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_admins_new_incident();
