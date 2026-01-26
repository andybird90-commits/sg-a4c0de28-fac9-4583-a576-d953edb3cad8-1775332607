-- Policy 4: Allow users to delete their files
CREATE POLICY "Allow authenticated users to delete evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'evidence-files' AND
  auth.uid() IS NOT NULL
);