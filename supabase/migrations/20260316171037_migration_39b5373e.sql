CREATE TABLE IF NOT EXISTS public.sdr_prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_number text NULL,
  website text NULL,
  status text NOT NULL DEFAULT 'new',
  rd_viability_score numeric(5,2) NULL,
  estimated_claim_band text NULL,
  ai_dossier_json jsonb NULL,
  last_enriched_at timestamp with time zone NULL,
  enrichment_error text NULL,
  bdm_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  bdm_call_scheduled_at timestamp with time zone NULL,
  bdm_call_duration_minutes integer NULL DEFAULT 30,
  bdm_call_teams_link text NULL,
  bdm_call_event_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sdr_prospects_pkey PRIMARY KEY (id),
  CONSTRAINT sdr_prospects_status_check CHECK (status IN (
    'new',
    'enriched',
    'contacted',
    'not_interested',
    'interested',
    'bdm_call_scheduled',
    'bdm_call_completed'
  )),
  CONSTRAINT sdr_prospects_estimated_claim_band_check CHECK (
    estimated_claim_band IS NULL
    OR estimated_claim_band IN ('0-25k','25k-50k','50k-100k','100k-250k','250k+')
  ),
  CONSTRAINT sdr_prospects_bdm_call_duration_minutes_check CHECK (
    bdm_call_duration_minutes IS NULL OR bdm_call_duration_minutes > 0
  )
);

ALTER TABLE public.sdr_prospects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'sdr_prospects' 
      AND policyname = 'sdr_prospects_internal_all'
  ) THEN
    CREATE POLICY sdr_prospects_internal_all
    ON public.sdr_prospects
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
      )
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sdr_prospects_created_by ON public.sdr_prospects(created_by);
CREATE INDEX IF NOT EXISTS idx_sdr_prospects_status ON public.sdr_prospects(status);
CREATE INDEX IF NOT EXISTS idx_sdr_prospects_score ON public.sdr_prospects(rd_viability_score DESC);