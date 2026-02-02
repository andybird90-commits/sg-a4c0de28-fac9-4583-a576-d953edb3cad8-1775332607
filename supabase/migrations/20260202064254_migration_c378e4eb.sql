-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cif-documents', 'cif-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to ensure clean state (optional, but good for idempotency)
DROP POLICY IF EXISTS "Authenticated users can upload cif documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read cif documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete cif documents" ON storage.objects;

-- 3. Create policies for the bucket
-- Allow uploads
CREATE POLICY "Authenticated users can upload cif documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cif-documents');

-- Allow reads
CREATE POLICY "Authenticated users can read cif documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cif-documents');

-- Allow deletes
CREATE POLICY "Authenticated users can delete cif documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cif-documents');