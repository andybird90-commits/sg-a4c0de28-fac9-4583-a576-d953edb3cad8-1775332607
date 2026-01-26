-- Policy 2: Allow users to view evidence files
CREATE POLICY "Allow authenticated users to view evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence-files' AND
  auth.uid() IS NOT NULL
);