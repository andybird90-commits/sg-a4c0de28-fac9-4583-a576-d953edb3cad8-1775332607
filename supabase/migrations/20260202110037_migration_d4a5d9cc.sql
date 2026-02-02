-- Step 6: Create function to handle bidirectional sync from claim projects back to source
CREATE OR REPLACE FUNCTION sync_claim_project_to_source()
RETURNS TRIGGER AS $$
BEGIN
  -- If linked to regular project, update it
  IF NEW.source_project_id IS NOT NULL THEN
    UPDATE projects
    SET
      name = NEW.name,
      description = NEW.description,
      start_date = NEW.start_date,
      end_date = NEW.end_date,
      updated_at = NOW()
    WHERE id = NEW.source_project_id;
  END IF;

  -- If linked to sidekick project, update it
  IF NEW.source_sidekick_project_id IS NOT NULL THEN
    UPDATE sidekick_projects
    SET
      name = NEW.name,
      description = NEW.description,
      sector = NEW.rd_theme,
      updated_at = NOW()
    WHERE id = NEW.source_sidekick_project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for claim project updates (bidirectional sync)
DROP TRIGGER IF EXISTS trigger_sync_claim_project_to_source ON claim_projects;
CREATE TRIGGER trigger_sync_claim_project_to_source
  AFTER UPDATE ON claim_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_claim_project_to_source();