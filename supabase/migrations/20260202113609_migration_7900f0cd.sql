-- Step 5: Create project_status_history table for audit trail
CREATE TABLE IF NOT EXISTS project_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_project_id UUID NOT NULL REFERENCES claim_projects(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_status_history_project ON project_status_history(claim_project_id, changed_at DESC);