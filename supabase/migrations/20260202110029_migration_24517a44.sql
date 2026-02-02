-- Step 5: Create function to sync updates from sidekick projects to claim projects
CREATE OR REPLACE FUNCTION sync_sidekick_project_update_to_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- Update linked claim project if it exists
  UPDATE claim_projects
  SET
    name = NEW.name,
    description = NEW.description,
    rd_theme = NEW.sector,
    updated_at = NOW()
  WHERE source_sidekick_project_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for sidekick project updates
DROP TRIGGER IF EXISTS trigger_sync_sidekick_project_update_to_claim ON sidekick_projects;
CREATE TRIGGER trigger_sync_sidekick_project_update_to_claim
  AFTER UPDATE ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_sidekick_project_update_to_claim();