INSERT INTO storage.buckets (id, name, public)
VALUES ('poh-files', 'poh-files', false);

CREATE POLICY "Users can upload own POH files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'poh-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own POH files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'poh-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anon users can upload POH files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'poh-files' AND
  (storage.foldername(name))[1] = 'anonymous'
);