ALTER TABLE claim_projects
ADD COLUMN IF NOT EXISTS source_bulk_project_id uuid REFERENCES bulk_projects(id) ON DELETE SET NULL;