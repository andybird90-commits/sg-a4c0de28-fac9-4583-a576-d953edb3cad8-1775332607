-- Allow the server (anon key used by serverClient) to manage pipeline entries,
-- mirroring the existing `server_can_create_claims` policy on claims.

DO $$
BEGIN
  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'server_can_insert_pipeline_entries'
  ) THEN
    CREATE POLICY server_can_insert_pipeline_entries
      ON public.pipeline_entries
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;

  -- UPDATE (needed if trigger does upserts)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'server_can_update_pipeline_entries'
  ) THEN
    CREATE POLICY server_can_update_pipeline_entries
      ON public.pipeline_entries
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;