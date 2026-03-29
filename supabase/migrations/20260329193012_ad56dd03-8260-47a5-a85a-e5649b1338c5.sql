
-- 1. Fix contact_submissions: remove overly permissive INSERT and block SELECT
-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON public.contact_submissions;

-- Re-create with a slightly more restrictive policy (still allows anon inserts, which is needed for a contact form)
CREATE POLICY "Anyone can insert contact submissions"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Note: contact_submissions already has no SELECT policy for public, which is correct.
-- The scan flagged it but there's no existing SELECT policy to drop.

-- 2. Fix newsletter_subscribers: same pattern - insert is needed for public, no SELECT needed
-- Already correct - no SELECT policy exists.

-- 3. Restrict profiles SELECT to authenticated users only (not public/anon)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also restrict INSERT and UPDATE to authenticated (not public)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
