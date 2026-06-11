
-- Allow admins to read contact submissions
CREATE POLICY "Admins can view contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read newsletter subscribers
CREATE POLICY "Admins can view newsletter subscribers"
ON public.newsletter_subscribers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tighten support_chat_messages INSERT: require referenced chat to exist
-- and be recent (active session window) to prevent injection into arbitrary threads.
DROP POLICY IF EXISTS "Anyone can insert support chat messages" ON public.support_chat_messages;
CREATE POLICY "Anyone can insert support chat messages"
ON public.support_chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_chats sc
    WHERE sc.id = chat_id
      AND sc.created_at > now() - interval '24 hours'
  )
);
