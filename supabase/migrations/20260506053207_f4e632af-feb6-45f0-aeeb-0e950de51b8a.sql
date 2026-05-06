
-- Per-user MFA settings (alongside Supabase native TOTP factors)
CREATE TABLE public.user_mfa_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_otp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_enrolled BOOLEAN NOT NULL DEFAULT false,
  preferred_method TEXT NOT NULL DEFAULT 'email' CHECK (preferred_method IN ('totp','email')),
  recovery_codes_hashed TEXT[] NOT NULL DEFAULT '{}',
  recovery_codes_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own mfa settings" ON public.user_mfa_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own mfa settings" ON public.user_mfa_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own mfa settings" ON public.user_mfa_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_mfa_settings_updated
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short-lived email OTP challenges. Codes are stored hashed.
CREATE TABLE public.email_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','enroll')),
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_otp_user ON public.email_otp_challenges(user_id, used, expires_at DESC);
ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;
-- No client policies — only edge functions (service role) touch this table.

-- Helper: returns whether a user must complete MFA (admin enforcement).
CREATE OR REPLACE FUNCTION public.user_requires_mfa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;
