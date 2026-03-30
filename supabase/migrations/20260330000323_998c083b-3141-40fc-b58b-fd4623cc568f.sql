
-- 1. Restrict profiles SELECT to own profile only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Add UPDATE policy on poh-files storage to prevent unauthorized file overwrites
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'poh-files' AND (storage.foldername(name))[1] = auth.uid()::text);
