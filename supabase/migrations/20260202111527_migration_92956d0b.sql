-- Step 2: Drop existing CASCADE constraints
ALTER TABLE claim_projects
DROP CONSTRAINT claim_projects_source_project_id_fkey,
DROP CONSTRAINT claim_projects_source_sidekick_project_id_fkey;