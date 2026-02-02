-- Step 3: Add new constraints with ON DELETE SET NULL
ALTER TABLE claim_projects
ADD CONSTRAINT claim_projects_source_project_id_fkey
  FOREIGN KEY (source_project_id) REFERENCES projects(id) ON DELETE SET NULL,
ADD CONSTRAINT claim_projects_source_sidekick_project_id_fkey
  FOREIGN KEY (source_sidekick_project_id) REFERENCES sidekick_projects(id) ON DELETE SET NULL;