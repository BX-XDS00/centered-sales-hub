
-- Fix search_path warning on tg_stamp_update
CREATE OR REPLACE FUNCTION public.tg_stamp_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

-- Lock down SECURITY DEFINER functions: revoke from public/anon, grant only to authenticated where needed
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_right(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_stamp_update() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_right(uuid, text) TO authenticated;
