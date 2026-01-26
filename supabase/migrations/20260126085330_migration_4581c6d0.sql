-- Policy 2: Allow users to view their own organization's evidence files
CREATE POLICY "Allow users to view their organization evidence files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sidekick-evidence' AND
  auth.uid() IS NOT NULL
);