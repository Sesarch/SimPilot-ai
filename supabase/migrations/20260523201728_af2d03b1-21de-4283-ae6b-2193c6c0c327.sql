-- 1) Scope user_mfa_settings policies to authenticated role only
DROP POLICY IF EXISTS "users insert own mfa settings" ON public.user_mfa_settings;
DROP POLICY IF EXISTS "users read own mfa settings" ON public.user_mfa_settings;
DROP POLICY IF EXISTS "users update own mfa settings" ON public.user_mfa_settings;

CREATE POLICY "users insert own mfa settings"
ON public.user_mfa_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own mfa settings"
ON public.user_mfa_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users update own mfa settings"
ON public.user_mfa_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Restrict realtime subscriptions to inbox topics to admins only
DROP POLICY IF EXISTS "Admins only can subscribe to inbox realtime topics" ON realtime.messages;

CREATE POLICY "Admins only can subscribe to inbox realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'inbox_threads:%'
    OR realtime.topic() LIKE 'inbox_messages:%'
    OR realtime.topic() LIKE 'inbox_notes:%'
    OR realtime.topic() = 'inbox_threads'
    OR realtime.topic() = 'inbox_messages'
    OR realtime.topic() = 'inbox_notes'
  )
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);