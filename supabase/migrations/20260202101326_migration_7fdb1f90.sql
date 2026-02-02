-- Create claim_projects table (separate from sidekick_projects and regular projects)
CREATE TABLE claim_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Project identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- R&D Classification
  rd_theme TEXT, -- e.g., "AI/ML", "Software Development", "Data Analytics"
  project_code TEXT, -- Internal reference code
  
  -- Technical details
  technical_understanding TEXT, -- What was attempted
  challenges_uncertainties TEXT, -- Technical challenges faced
  qualifying_activities TEXT[], -- Array of qualifying R&D activities
  advance_in_science TEXT, -- How this advances science/technology
  
  -- Costs allocation
  staff_cost NUMERIC(14,2) DEFAULT 0,
  subcontractor_cost NUMERIC(14,2) DEFAULT 0,
  consumables_cost NUMERIC(14,2) DEFAULT 0,
  software_cost NUMERIC(14,2) DEFAULT 0,
  total_qualifying_cost NUMERIC(14,2) GENERATED ALWAYS AS (
    COALESCE(staff_cost, 0) + 
    COALESCE(subcontractor_cost, 0) + 
    COALESCE(consumables_cost, 0) + 
    COALESCE(software_cost, 0)
  ) STORED,
  
  -- Project timeline
  start_date DATE,
  end_date DATE,
  
  -- Status and ownership
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'approved', 'rejected')),
  created_by UUID REFERENCES profiles(id),
  technical_reviewer UUID REFERENCES profiles(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_claim_projects_claim_id ON claim_projects(claim_id);
CREATE INDEX idx_claim_projects_org_id ON claim_projects(org_id);
CREATE INDEX idx_claim_projects_status ON claim_projects(status);

-- Enable RLS
ALTER TABLE claim_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view claim projects"
  ON claim_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM organisation_users ou
      WHERE ou.org_id = claim_projects.org_id AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Internal users can create claim projects"
  ON claim_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can update claim projects"
  ON claim_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can delete claim projects"
  ON claim_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );