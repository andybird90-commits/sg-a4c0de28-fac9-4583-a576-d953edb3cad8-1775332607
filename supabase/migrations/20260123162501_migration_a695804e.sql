-- Create the rd-sidekick storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rd-sidekick',
  'rd-sidekick',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for rd-sidekick bucket
CREATE POLICY "Users can view files in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'rd-sidekick' AND
  (storage.foldername(name))[1] = 'org' AND
  public.is_org_member(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Users can upload files to their org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rd-sidekick' AND
  (storage.foldername(name))[1] = 'org' AND
  public.is_org_member(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Employees can delete files in their org"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rd-sidekick' AND
  (storage.foldername(name))[1] = 'org' AND
  public.is_org_employee(((storage.foldername(name))[2])::uuid)
);