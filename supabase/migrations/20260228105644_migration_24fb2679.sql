DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Authenticated users can select pipeline entries'
  ) THEN
    CREATE POLICY "Authenticated users can select pipeline entries"
    ON public.pipeline_entries
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Authenticated users can insert pipeline entries'
  ) THEN
    CREATE POLICY "Authenticated users can insert pipeline entries"
    ON public.pipeline_entries
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Authenticated users can update pipeline entries'
  ) THEN
    CREATE POLICY "Authenticated users can update pipeline entries"
    ON public.pipeline_entries
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Authenticated users can delete pipeline entries'
  ) THEN
    CREATE POLICY "Authenticated users can delete pipeline entries"
    ON public.pipeline_entries
    FOR DELETE
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;