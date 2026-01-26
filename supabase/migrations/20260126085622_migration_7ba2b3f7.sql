-- Drop old policies for the old bucket name
DROP POLICY IF EXISTS "Allow users to upload evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view evidence files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their files" ON storage.objects;

-- Create RLS policies for the evidence-files bucket

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence-files' AND
  auth.uid() IS NOT NULL
);