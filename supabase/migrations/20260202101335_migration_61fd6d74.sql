-- Create claim_costs table for detailed cost tracking
CREATE TABLE claim_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  project_id UUID REFERENCES claim_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Cost details
  cost_type TEXT NOT NULL CHECK (cost_type IN ('staff', 'subcontractor', 'consumables', 'software', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  
  -- Staff-specific fields
  staff_member_name TEXT,
  staff_role TEXT,
  hours_worked NUMERIC(8,2),
  hourly_rate NUMERIC(10,2),
  
  -- Date information
  cost_date DATE,
  period_start DATE,
  period_end DATE,
  
  -- Supporting information
  invoice_reference TEXT,
  notes TEXT,
  
  -- Approval
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_claim_costs_claim_id ON claim_costs(claim_id);
CREATE INDEX idx_claim_costs_project_id ON claim_costs(project_id);
CREATE INDEX idx_claim_costs_org_id ON claim_costs(org_id);
CREATE INDEX idx_claim_costs_type ON claim_costs(cost_type);
CREATE INDEX idx_claim_costs_approved ON claim_costs(approved);

-- Enable RLS
ALTER TABLE claim_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view claim costs"
  ON claim_costs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can create claim costs"
  ON claim_costs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can update claim costs"
  ON claim_costs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can delete claim costs"
  ON claim_costs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );