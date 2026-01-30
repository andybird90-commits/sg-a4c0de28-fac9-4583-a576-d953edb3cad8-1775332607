-- ============================================================================
-- 5) CREATE ENGAGEMENTS AND CLAIMS TABLES
-- ============================================================================

-- Create engagements table
CREATE TABLE IF NOT EXISTS engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NULL,
  end_date date NULL,
  fee_model text NULL,
  notes text NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE engagements IS 'R&D tax engagements with client organisations';
COMMENT ON COLUMN engagements.fee_model IS 'Fee structure: fixed, percentage of benefit, hybrid, etc.';

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  engagement_id uuid NULL REFERENCES engagements(id) ON DELETE SET NULL,
  claim_year int NOT NULL,
  period_start date NULL,
  period_end date NULL,
  status text NOT NULL DEFAULT 'intake' CHECK (status IN (
    'intake', 'feasibility_review', 'data_gathering', 'draft_in_progress',
    'technical_signoff', 'cost_signoff', 'final_signoff', 'client_review',
    'ready_to_file', 'submitted_hmrc', 'hmrc_feedback', 'completed'
  )),
  bd_owner_id uuid NULL REFERENCES profiles(id),
  technical_lead_id uuid NULL REFERENCES profiles(id),
  cost_lead_id uuid NULL REFERENCES profiles(id),
  ops_owner_id uuid NULL REFERENCES profiles(id),
  director_id uuid NULL REFERENCES profiles(id),
  expected_submission_date date NULL,
  actual_submission_date date NULL,
  hmrc_reference text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE claims IS 'R&D tax claims with full lifecycle tracking';
COMMENT ON COLUMN claims.status IS 'Claim lifecycle stage';

-- Add foreign key from sidekick_projects to claims
ALTER TABLE sidekick_projects
DROP CONSTRAINT IF EXISTS sidekick_projects_claim_id_fkey;

ALTER TABLE sidekick_projects
ADD CONSTRAINT sidekick_projects_claim_id_fkey 
FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE SET NULL;

-- Ensure rd_claim_evidence.claim_id references claims
ALTER TABLE rd_claim_evidence
DROP CONSTRAINT IF EXISTS rd_claim_evidence_claim_id_fkey;

ALTER TABLE rd_claim_evidence
ADD CONSTRAINT rd_claim_evidence_claim_id_fkey 
FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users only can access engagements
CREATE POLICY "Internal users can view engagements"
ON engagements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM organisation_users ou
    WHERE ou.org_id = engagements.org_id
      AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Internal users can create engagements"
ON engagements FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update engagements"
ON engagements FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- RLS: Internal users only can access claims
CREATE POLICY "Internal users can view claims"
ON claims FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM organisation_users ou
    WHERE ou.org_id = claims.org_id
      AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Internal users can create claims"
ON claims FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update claims"
ON claims FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);