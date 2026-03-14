DO $$
BEGIN
  -- Evidence bucket: allow authenticated users to INSERT
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'bulk_evidence_insert'
  ) THEN
    CREATE POLICY "bulk_evidence_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'bulk-project-evidence');
  END IF;

  -- Evidence bucket: allow authenticated users to SELECT
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'bulk_evidence_select'
  ) THEN
    CREATE POLICY "bulk_evidence_select"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'bulk-project-evidence');
  END IF;

  -- Financials bucket: allow authenticated users to INSERT
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'bulk_financials_insert'
  ) THEN
    CREATE POLICY "bulk_financials_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'bulk-project-financials');
  END IF;

  -- Financials bucket: allow authenticated users to SELECT
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'bulk_financials_select'
  ) THEN
    CREATE POLICY "bulk_financials_select"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'bulk-project-financials');
  END IF;
END
$$;