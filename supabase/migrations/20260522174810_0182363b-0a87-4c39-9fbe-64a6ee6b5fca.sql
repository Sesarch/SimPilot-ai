
-- 1) Pin search_path on SECURITY DEFINER email queue functions and lock down EXECUTE
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 2) Explicit deny-all policies (formalize default-deny) for highly sensitive tables
DROP POLICY IF EXISTS "Deny all client access to email OTP challenges" ON public.email_otp_challenges;
CREATE POLICY "Deny all client access to email OTP challenges"
  ON public.email_otp_challenges
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny all client access to stripe webhook secrets" ON public.stripe_webhook_signing_secrets;
CREATE POLICY "Deny all client access to stripe webhook secrets"
  ON public.stripe_webhook_signing_secrets
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3) Tighten realtime.messages policy to allowlist only the ai_safety_flags topic pattern
DROP POLICY IF EXISTS "Users see only their own safety flag events" ON realtime.messages;
CREATE POLICY "Users see only their own safety flag events"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'ai_safety_flags:%'
    AND (auth.uid())::text = split_part(realtime.topic(), ':', 2)
  );

-- 4) Allow authenticated users to read their own role entries (least-privilege read)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
