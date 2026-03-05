-- 1) Narrative text table: rd_project_narratives
CREATE TABLE IF NOT EXISTS public.rd_project_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_project_id uuid NOT NULL REFERENCES public.claim_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  version_number integer NOT NULL DEFAULT 1,
  generated_by text NULL,
  advance_sought text NOT NULL,
  baseline_knowledge text NOT NULL,
  technological_uncertainty text NOT NULL,
  work_undertaken text NOT NULL,
  outcome text NOT NULL,
  quality_score numeric(5,2) NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rd_project_narratives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rd_project_narratives'
      AND policyname = 'rd_narratives_auth_all'
  ) THEN
    CREATE POLICY rd_narratives_auth_all
      ON public.rd_project_narratives
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_rd_project_narratives_project
  ON public.rd_project_narratives (claim_project_id);

-- 2) Narrative state pointer table: rd_project_narrative_state
CREATE TABLE IF NOT EXISTS public.rd_project_narrative_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_project_id uuid NOT NULL UNIQUE REFERENCES public.claim_projects(id) ON DELETE CASCADE,
  current_narrative_id uuid NULL REFERENCES public.rd_project_narratives(id) ON DELETE SET NULL,
  final_narrative_id uuid NULL REFERENCES public.rd_project_narratives(id) ON DELETE SET NULL,
  last_edited_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_edited_at timestamptz NULL
);

ALTER TABLE public.rd_project_narrative_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rd_project_narrative_state'
      AND policyname = 'rd_narrative_state_auth_all'
  ) THEN
    CREATE POLICY rd_narrative_state_auth_all
      ON public.rd_project_narrative_state
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_rd_project_narrative_state_project
  ON public.rd_project_narrative_state (claim_project_id);

-- 3) Audit log table: rd_audit_log
CREATE TABLE IF NOT EXISTS public.rd_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  project_id uuid NULL REFERENCES public.claim_projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  details_json jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rd_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rd_audit_log'
      AND policyname = 'rd_audit_internal_only'
  ) THEN
    CREATE POLICY rd_audit_internal_only
      ON public.rd_audit_log
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      ));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_rd_audit_claim
  ON public.rd_audit_log (claim_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rd_audit_project
  ON public.rd_audit_log (project_id, created_at DESC);

-- 4) Add draft/final PDF URL columns on claims
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS draft_pdf_url text NULL,
  ADD COLUMN IF NOT EXISTS final_pdf_url text NULL;