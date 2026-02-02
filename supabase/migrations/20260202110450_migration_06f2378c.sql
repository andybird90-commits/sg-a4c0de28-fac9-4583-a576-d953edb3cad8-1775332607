-- Step 6: Create ONE-WAY DELETE handling (mark claim project when source is deleted)
CREATE OR REPLACE FUNCTION handle_source_project_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a source project is deleted, mark claim project as no longer synced
  UPDATE claim_projects
  SET 
    auto_synced = false,
    source_project_id = NULL
  WHERE source_project_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for regular projects
DROP TRIGGER IF EXISTS handle_project_deletion ON projects;
CREATE TRIGGER handle_project_deletion
  BEFORE DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_source_project_deletion();

-- Create similar function for sidekick projects
CREATE OR REPLACE FUNCTION handle_source_sidekick_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a source sidekick project is deleted, mark claim project as no longer synced
  UPDATE claim_projects
  SET 
    auto_synced = false,
    source_sidekick_project_id = NULL
  WHERE source_sidekick_project_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sidekick projects
DROP TRIGGER IF EXISTS handle_sidekick_deletion ON sidekick_projects;
CREATE TRIGGER handle_sidekick_deletion
  BEFORE DELETE ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_source_sidekick_deletion();