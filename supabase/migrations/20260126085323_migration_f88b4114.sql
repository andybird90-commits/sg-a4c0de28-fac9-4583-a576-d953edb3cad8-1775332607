-- Create RLS policies for the sidekick-evidence bucket

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload evidence files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sidekick-evidence' AND
  auth.uid() IS NOT NULL
);