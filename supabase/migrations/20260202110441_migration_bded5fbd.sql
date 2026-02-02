-- Step 5: Create ONE-WAY UPDATE sync from sidekick projects (only if auto_synced = true)
CREATE OR REPLACE FUNCTION auto_update_sidekick_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_rd_theme TEXT;
BEGIN
  -- Only sync if relevant fields changed
  IF (NEW.name != OLD.name OR NEW.description != OLD.description OR NEW.sector != OLD.sector) THEN
    -- Map sector to rd_theme
    v_rd_theme := COALESCE(NEW.sector, 'Engineering');
    
    -- Update linked claim projects that have auto_sync enabled
    UPDATE claim_projects
    SET 
      name = NEW.name,
      description = NEW.description,
      rd_theme = v_rd_theme,
      last_synced_at = NOW()
    WHERE source_sidekick_project_id = NEW.id
      AND auto_synced = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_update_sidekick_to_claim ON sidekick_projects;
CREATE TRIGGER auto_update_sidekick_to_claim
  AFTER UPDATE ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_sidekick_to_claim();