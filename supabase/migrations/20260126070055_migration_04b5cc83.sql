-- 3. LINK FEASIBILITY_ANALYSES TO SIDEKICK_PROJECTS
-- Add project_id column to existing feasibility_analyses table
ALTER TABLE feasibility_analyses
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES sidekick_projects(id) ON DELETE CASCADE;

-- Add index for project-based lookups
CREATE INDEX IF NOT EXISTS idx_feasibility_project ON feasibility_analyses(project_id) WHERE project_id IS NOT NULL;

COMMENT ON COLUMN feasibility_analyses.project_id IS 'Links feasibility run to a Sidekick project (nullable for backward compatibility)';

-- Update updated_at timestamp function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for sidekick_projects updated_at
DROP TRIGGER IF EXISTS update_sidekick_projects_updated_at ON sidekick_projects;
CREATE TRIGGER update_sidekick_projects_updated_at
  BEFORE UPDATE ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();