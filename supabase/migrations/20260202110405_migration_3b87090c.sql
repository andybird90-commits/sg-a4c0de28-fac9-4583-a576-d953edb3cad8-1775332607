-- Step 1: Add sync metadata columns to claim_projects
ALTER TABLE claim_projects
ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_sidekick_project_id UUID REFERENCES sidekick_projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraint to ensure only one source type
ALTER TABLE claim_projects
DROP CONSTRAINT IF EXISTS claim_projects_single_source_check;

ALTER TABLE claim_projects
ADD CONSTRAINT claim_projects_single_source_check CHECK (
  (source_project_id IS NOT NULL)::int + 
  (source_sidekick_project_id IS NOT NULL)::int <= 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_projects_source ON claim_projects (source_project_id, org_id);
CREATE INDEX IF NOT EXISTS idx_claim_projects_sidekick_source ON claim_projects (source_sidekick_project_id, org_id);