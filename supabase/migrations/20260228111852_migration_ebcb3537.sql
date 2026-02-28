DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Internal staff can delete pipeline_entries'
  ) THEN
    DROP POLICY "Internal staff can delete pipeline_entries" ON public.pipeline_entries;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Internal staff can insert pipeline_entries'
  ) THEN
    DROP POLICY "Internal staff can insert pipeline_entries" ON public.pipeline_entries;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Internal staff can select pipeline_entries'
  ) THEN
    DROP POLICY "Internal staff can select pipeline_entries" ON public.pipeline_entries;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_entries'
      AND policyname = 'Internal staff can update pipeline_entries'
  ) THEN
    DROP POLICY "Internal staff can update pipeline_entries" ON public.pipeline_entries;
  END IF;
END
$$;