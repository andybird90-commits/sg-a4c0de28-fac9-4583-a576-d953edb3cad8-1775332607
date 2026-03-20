ALTER TABLE public.bulk_project_uploads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bulk_project_uploads'
      AND policyname = 'bulk_project_uploads_staff_or_org_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY bulk_project_uploads_staff_or_org_read
      ON public.bulk_project_uploads
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.internal_role IS NOT NULL
        )
        OR EXISTS (
          SELECT 1
          FROM public.bulk_projects bp
          JOIN public.organisation_users ou ON ou.org_id = bp.org_id
          WHERE bp.id = bulk_project_uploads.bulk_project_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'storage_bulk_project_staff_or_org_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY storage_bulk_project_staff_or_org_read
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id IN ('bulk-project-evidence', 'bulk-project-financials')
        AND (
          EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.internal_role IS NOT NULL
          )
          OR EXISTS (
            SELECT 1
            FROM public.bulk_projects bp
            JOIN public.organisation_users ou ON ou.org_id = bp.org_id
            WHERE ou.user_id = auth.uid()
              AND bp.id::text = split_part(storage.objects.name, '/', 1)
          )
        )
      )
    $policy$;
  END IF;
END
$$;