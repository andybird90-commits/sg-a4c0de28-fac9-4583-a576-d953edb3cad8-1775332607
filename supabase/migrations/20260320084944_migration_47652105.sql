CREATE TABLE IF NOT EXISTS public.claim_apportionment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  bucket_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NULL,
  file_size_bytes BIGINT NULL,

  uploaded_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  parse_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (parse_status IN ('uploaded', 'parsing', 'parsed', 'error')),
  confidence NUMERIC NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_apportionment_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_sources' AND policyname = 'Org members can view apportionment sources'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can view apportionment sources"
      ON public.claim_apportionment_sources
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_sources.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_sources' AND policyname = 'Org members can insert apportionment sources'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can insert apportionment sources"
      ON public.claim_apportionment_sources
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_sources.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_sources' AND policyname = 'Org members can update apportionment sources'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can update apportionment sources"
      ON public.claim_apportionment_sources
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_sources.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_sources' AND policyname = 'Org members can delete apportionment sources'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can delete apportionment sources"
      ON public.claim_apportionment_sources
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_sources.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;

ALTER TABLE public.claim_apportionment_lines
  ADD COLUMN IF NOT EXISTS source_id UUID NULL REFERENCES public.claim_apportionment_sources(id) ON DELETE SET NULL;

ALTER TABLE public.claim_apportionments
  ADD COLUMN IF NOT EXISTS source_id UUID NULL REFERENCES public.claim_apportionment_sources(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'claim_apportionment_lines_source_id_line_idx_unique'
  ) THEN
    EXECUTE 'ALTER TABLE public.claim_apportionment_lines ADD CONSTRAINT claim_apportionment_lines_source_id_line_idx_unique UNIQUE (source_id, line_index)';
  END IF;
END
$$;