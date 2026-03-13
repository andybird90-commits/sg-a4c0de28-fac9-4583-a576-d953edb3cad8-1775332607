-- 1) Create bulk_projects table
CREATE TABLE IF NOT EXISTS public.bulk_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  created_by uuid,
  name text NOT NULL,
  description text,
  sector text,
  stage text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create bulk_project_uploads table
CREATE TABLE IF NOT EXISTS public.bulk_project_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_project_id uuid NOT NULL REFERENCES public.bulk_projects(id) ON DELETE CASCADE,
  upload_type text NOT NULL CHECK (upload_type IN ('evidence','financial')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  bucket_name text NOT NULL,
  mime_type text,
  file_size_bytes bigint NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.bulk_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_project_uploads ENABLE ROW LEVEL SECURITY;

-- 4) Simple per-user RLS policies (scoped by created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bulk_projects'
      AND policyname = 'Users can manage their own bulk projects'
  ) THEN
    CREATE POLICY "Users can manage their own bulk projects"
      ON public.bulk_projects
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bulk_project_uploads'
      AND policyname = 'Users can manage their own bulk project uploads'
  ) THEN
    CREATE POLICY "Users can manage their own bulk project uploads"
      ON public.bulk_project_uploads
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;