-- Step 4: Create ONE-WAY UPDATE sync from regular projects (only if auto_synced = true)
CREATE OR REPLACE FUNCTION auto_update_project_to_claim()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if name or description changed
  IF (NEW.name != OLD.name OR NEW.description != OLD.description) THEN
    -- Update linked claim projects that have auto_sync enabled
    UPDATE claim_projects
    SET 
      name = NEW.name,
      description = NEW.description,
      last_synced_at = NOW()
    WHERE source_project_id = NEW.id
      AND auto_synced = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_update_project_to_claim ON projects;
CREATE TRIGGER auto_update_project_to_claim
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_project_to_claim();