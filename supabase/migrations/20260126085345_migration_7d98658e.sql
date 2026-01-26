-- Policy 4: Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their evidence files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sidekick-evidence' AND
  auth.uid() IS NOT NULL
);