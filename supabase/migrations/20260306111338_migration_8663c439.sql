CREATE TABLE IF NOT EXISTS sidekick_project_timeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES sidekick_projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sidekick_project_timeline_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sidekick_project_timeline_items'
      AND policyname = 'client_manage_own_timeline_items'
  ) THEN
    CREATE POLICY client_manage_own_timeline_items
    ON sidekick_project_timeline_items
    FOR ALL
    TO authenticated
    USING (
      created_by = auth.uid()
      AND project_id IN (
        SELECT sp.id
        FROM sidekick_projects sp
        JOIN organisation_users ou ON ou.org_id = sp.company_id
        WHERE ou.user_id = auth.uid()
      )
    )
    WITH CHECK (
      created_by = auth.uid()
      AND project_id IN (
        SELECT sp.id
        FROM sidekick_projects sp
        JOIN organisation_users ou ON ou.org_id = sp.company_id
        WHERE ou.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sidekick_project_timeline_items'
      AND policyname = 'internal_view_timeline_items'
  ) THEN
    CREATE POLICY internal_view_timeline_items
    ON sidekick_project_timeline_items
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      )
    );
  END IF;
END
$$;