CREATE POLICY "No one can read contact submissions"
ON public.contact_submissions
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "No one can read newsletter subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO anon, authenticated
USING (false);