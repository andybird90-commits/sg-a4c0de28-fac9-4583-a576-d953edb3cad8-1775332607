-- Step 4: Create function to sync updates from regular projects to claim projects
CREATE OR REPLACE FUNCTION sync_project_update_to_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- Update linked claim project if it exists
  UPDATE claim_projects
  SET
    name = NEW.name,
    description = NEW.description,
    start_date = NEW.start_date,
    end_date = NEW.end_date,
    updated_at = NOW()
  WHERE source_project_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for project updates
DROP TRIGGER IF EXISTS trigger_sync_project_update_to_claim ON projects;
CREATE TRIGGER trigger_sync_project_update_to_claim
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_update_to_claim();