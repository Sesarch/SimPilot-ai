
-- Comp grants table
CREATE TABLE public.user_comp_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_tier TEXT NOT NULL,
  reason TEXT,
  granted_by UUID,
  granted_by_email TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_comp_grants_user ON public.user_comp_grants(user_id) WHERE revoked_at IS NULL;
ALTER TABLE public.user_comp_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage comp grants" ON public.user_comp_grants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own active grant" ON public.user_comp_grants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND revoked_at IS NULL);

-- Admin audit log
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action, created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts only (no INSERT policy for authenticated)
