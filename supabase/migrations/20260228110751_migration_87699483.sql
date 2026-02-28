DO $$
BEGIN
  -- Allow service_role to INSERT into pipeline_entries (used by server-side claim start trigger)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'service_role_can_insert_pipeline_entries'
  ) THEN
    CREATE POLICY service_role_can_insert_pipeline_entries
      ON public.pipeline_entries
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  -- Allow service_role to UPDATE pipeline_entries (for ON CONFLICT DO UPDATE paths)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'service_role_can_update_pipeline_entries'
  ) THEN
    CREATE POLICY service_role_can_update_pipeline_entries
      ON public.pipeline_entries
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;