-- Step 1: Add columns to claim_projects to track source projects
ALTER TABLE claim_projects
ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_sidekick_project_id UUID REFERENCES sidekick_projects(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_projects_source_project ON claim_projects(source_project_id);
CREATE INDEX IF NOT EXISTS idx_claim_projects_source_sidekick ON claim_projects(source_sidekick_project_id);

-- Add constraint to ensure only one source is set
ALTER TABLE claim_projects
ADD CONSTRAINT chk_single_source CHECK (
  (source_project_id IS NOT NULL)::int + 
  (source_sidekick_project_id IS NOT NULL)::int <= 1
);