CREATE TABLE IF NOT EXISTS public.sdr_engagement_strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.sdr_prospects(id) ON DELETE CASCADE,
  run_mode TEXT NOT NULL CHECK (run_mode IN ('refresh', 'full_live')),
  source_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_pack JSONB NOT NULL,
  strategy_output JSONB,
  warnings TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sdr_engagement_strategy_runs_prospect_id_created_at_idx
  ON public.sdr_engagement_strategy_runs (prospect_id, created_at DESC);

ALTER TABLE public.sdr_engagement_strategy_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sdr_engagement_strategy_runs'
      AND policyname = 'Authenticated can read engagement strategy runs'
  ) THEN
    CREATE POLICY "Authenticated can read engagement strategy runs"
      ON public.sdr_engagement_strategy_runs
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sdr_engagement_strategy_runs'
      AND policyname = 'Authenticated can insert engagement strategy runs'
  ) THEN
    CREATE POLICY "Authenticated can insert engagement strategy runs"
      ON public.sdr_engagement_strategy_runs
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;