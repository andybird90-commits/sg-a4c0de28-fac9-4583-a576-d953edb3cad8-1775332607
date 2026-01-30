-- ============================================================================
-- 7) CREATE PIPELINE MANAGER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  engagement_id uuid NULL REFERENCES engagements(id) ON DELETE SET NULL,
  claim_id uuid NULL REFERENCES claims(id) ON DELETE SET NULL,
  period_label text NULL,
  expected_accounts_filing_date date NULL,
  expected_submission_date date NULL,
  expected_fee numeric(12,2) NULL,
  estimated_qualifying_spend numeric(14,2) NULL,
  probability numeric(5,2) NULL CHECK (probability >= 0 AND probability <= 100),
  weighted_fee numeric(14,2) NULL,
  filing_pattern text NULL CHECK (filing_pattern IN ('early', 'on_time', 'late')),
  predictor_last_run_at timestamptz NULL,
  predictor_confidence text NULL CHECK (predictor_confidence IN ('high', 'medium', 'low')),
  notes text NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pipeline_entries IS 'Pipeline forecasting and tracking for R&D claims';
COMMENT ON COLUMN pipeline_entries.period_label IS 'Accounting period label, e.g. "YE 31/12/2024"';
COMMENT ON COLUMN pipeline_entries.probability IS 'Win probability 0-100';
COMMENT ON COLUMN pipeline_entries.weighted_fee IS 'Expected fee * probability';
COMMENT ON COLUMN pipeline_entries.filing_pattern IS 'Filing behavior: early, on_time, late';

-- Enable RLS
ALTER TABLE pipeline_entries ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users only
CREATE POLICY "Internal users can view pipeline"
ON pipeline_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM organisation_users ou
    WHERE ou.org_id = pipeline_entries.org_id
      AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Internal users can create pipeline entries"
ON pipeline_entries FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update pipeline entries"
ON pipeline_entries FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can delete pipeline entries"
ON pipeline_entries FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);