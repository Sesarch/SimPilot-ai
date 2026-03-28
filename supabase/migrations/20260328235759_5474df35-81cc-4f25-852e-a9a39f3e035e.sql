CREATE POLICY "Users can delete own POH files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'poh-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);