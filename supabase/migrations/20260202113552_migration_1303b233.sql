-- Step 3: Create project_collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_project_id UUID NOT NULL REFERENCES claim_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator', 'reviewer')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(claim_project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(claim_project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON project_collaborators(user_id);