-- Policy 3: Allow users to update their files
CREATE POLICY "Allow authenticated users to update evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidence-files' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'evidence-files' AND
  auth.uid() IS NOT NULL
);