CREATE TABLE IF NOT EXISTS public.claim_apportionment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  source_file_id UUID NULL REFERENCES public.claim_apportionment_source_files(id) ON DELETE SET NULL,

  line_index INTEGER NOT NULL DEFAULT 0,

  raw_name TEXT NULL,
  normalised_name TEXT NULL,
  category TEXT NOT NULL DEFAULT 'unknown' CHECK (category IN ('supplier', 'subcontractor', 'staff', 'unknown')),
  reference_text TEXT NULL,

  debit_total NUMERIC NULL,
  credit_total NUMERIC NULL,
  net_total NUMERIC NULL,
  vat_total NUMERIC NULL,
  gross_total NUMERIC NULL,

  source_page INTEGER NULL,
  confidence NUMERIC NULL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  include BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,

  raw_extraction JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT claim_apportionment_lines_source_file_line_idx_unique UNIQUE (source_file_id, line_index)
);

CREATE TABLE IF NOT EXISTS public.claim_apportionments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  source_line_id UUID NULL REFERENCES public.claim_apportionment_lines(id) ON DELETE SET NULL,
  source_file_id UUID NULL REFERENCES public.claim_apportionment_source_files(id) ON DELETE SET NULL,

  item_name TEXT NOT NULL DEFAULT '',
  heading TEXT NOT NULL DEFAULT 'other',
  category TEXT NOT NULL DEFAULT 'unknown' CHECK (category IN ('supplier', 'subcontractor', 'staff', 'unknown')),

  total_source_cost NUMERIC NOT NULL DEFAULT 0,
  claimable_percent NUMERIC NOT NULL DEFAULT 0 CHECK (claimable_percent >= 0 AND claimable_percent <= 1),
  claimable_amount NUMERIC NOT NULL DEFAULT 0 CHECK (claimable_amount >= 0),

  justification TEXT NULL,
  rd_activity_note TEXT NULL,
  reviewer_note TEXT NULL,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'excluded')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.claim_apportionment_cost_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apportionment_id UUID NOT NULL REFERENCES public.claim_apportionments(id) ON DELETE CASCADE,
  claim_cost_id UUID NULL REFERENCES public.claim_costs(id) ON DELETE SET NULL,
  pushed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  push_snapshot JSONB NULL,
  CONSTRAINT claim_apportionment_cost_links_apportionment_unique UNIQUE (apportionment_id)
);

ALTER TABLE public.claim_apportionment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_apportionments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_apportionment_cost_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_lines' AND policyname = 'Org members can view apportionment lines'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can view apportionment lines"
      ON public.claim_apportionment_lines
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_lines.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_lines' AND policyname = 'Org members can insert apportionment lines'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can insert apportionment lines"
      ON public.claim_apportionment_lines
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_lines.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_lines' AND policyname = 'Org members can update apportionment lines'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can update apportionment lines"
      ON public.claim_apportionment_lines
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionment_lines.org_id
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionments' AND policyname = 'Org members can view apportionments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can view apportionments"
      ON public.claim_apportionments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionments.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionments' AND policyname = 'Org members can insert apportionments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can insert apportionments"
      ON public.claim_apportionments
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionments.org_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionments' AND policyname = 'Org members can update apportionments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can update apportionments"
      ON public.claim_apportionments
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organisation_users ou
          WHERE ou.org_id = claim_apportionments.org_id
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_cost_links' AND policyname = 'Org members can view apportionment cost links'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can view apportionment cost links"
      ON public.claim_apportionment_cost_links
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.claim_apportionments a
          JOIN public.organisation_users ou ON ou.org_id = a.org_id
          WHERE a.id = claim_apportionment_cost_links.apportionment_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claim_apportionment_cost_links' AND policyname = 'Org members can insert apportionment cost links'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Org members can insert apportionment cost links"
      ON public.claim_apportionment_cost_links
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.claim_apportionments a
          JOIN public.organisation_users ou ON ou.org_id = a.org_id
          WHERE a.id = claim_apportionment_cost_links.apportionment_id
            AND ou.user_id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;