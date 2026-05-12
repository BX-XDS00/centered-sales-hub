-- Add blocked flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- Login events table
CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_events insert self"
ON public.login_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "login_events select self or admin"
ON public.login_events FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin_or_super(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_login_events_user ON public.login_events(user_id, created_at DESC);

-- Tighten profiles update: admins can update non-admins; only super_admin can update admins
DROP POLICY IF EXISTS "profiles admin update" ON public.profiles;

CREATE POLICY "profiles admin update non-admin"
ON public.profiles FOR UPDATE TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  AND NOT public.has_role(id, 'admin'::app_role)
  AND NOT public.has_role(id, 'super_admin'::app_role)
);

CREATE POLICY "profiles super update admins"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));
