DO $$
BEGIN
  -- bulk_projects: allow internal users to SELECT bulk projects for orgs they belong to
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bulk_projects'
      AND policyname = 'Internal users can view bulk projects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Internal users can view bulk projects"
      ON public.bulk_projects
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.internal_role IS NOT NULL
        )
        AND EXISTS (
          SELECT 1
          FROM public.organisation_users ou
          WHERE ou.org_id = bulk_projects.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  -- bulk_project_uploads: allow internal users to SELECT uploads for bulk projects in their orgs
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bulk_project_uploads'
      AND policyname = 'Internal users can view bulk project uploads'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Internal users can view bulk project uploads"
      ON public.bulk_project_uploads
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.internal_role IS NOT NULL
        )
        AND EXISTS (
          SELECT 1
          FROM public.bulk_projects bp
          JOIN public.organisation_users ou
            ON ou.org_id = bp.org_id
          WHERE bp.id = bulk_project_uploads.bulk_project_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;