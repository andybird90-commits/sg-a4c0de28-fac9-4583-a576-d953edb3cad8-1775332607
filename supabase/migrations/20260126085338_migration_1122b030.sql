-- Policy 3: Allow users to update their own uploaded files
CREATE POLICY "Allow users to update their evidence files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sidekick-evidence' AND
  auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'sidekick-evidence' AND
  auth.uid() IS NOT NULL
);