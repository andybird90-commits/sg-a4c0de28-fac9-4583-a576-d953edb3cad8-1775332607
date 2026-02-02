-- Create trigger to disable auto_sync when staff manually edits claim project
-- This prevents staff's work from being overwritten by client updates
CREATE OR REPLACE FUNCTION disable_auto_sync_on_manual_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an UPDATE and auto_synced is currently true
  -- and any of the "staff-only" fields are being changed
  -- then disable auto_sync
  IF TG_OP = 'UPDATE' AND OLD.auto_synced = true THEN
    -- Check if staff-specific fields are being modified
    IF (
      (NEW.technical_understanding IS DISTINCT FROM OLD.technical_understanding AND NEW.technical_understanding IS NOT NULL) OR
      (NEW.challenges_uncertainties IS DISTINCT FROM OLD.challenges_uncertainties AND NEW.challenges_uncertainties IS NOT NULL) OR
      (NEW.qualifying_activities IS DISTINCT FROM OLD.qualifying_activities AND NEW.qualifying_activities <> OLD.qualifying_activities) OR
      (NEW.rd_theme IS DISTINCT FROM OLD.rd_theme AND OLD.rd_theme IS NULL) OR
      (NEW.start_date IS DISTINCT FROM OLD.start_date AND OLD.start_date IS NULL) OR
      (NEW.end_date IS DISTINCT FROM OLD.end_date AND OLD.end_date IS NULL)
    ) THEN
      -- Staff has manually edited, disable auto-sync
      NEW.auto_synced := false;
      RAISE NOTICE 'Auto-sync disabled for claim project % due to manual edit', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE UPDATE trigger (must run before the update happens)
DROP TRIGGER IF EXISTS disable_auto_sync_trigger ON claim_projects;
CREATE TRIGGER disable_auto_sync_trigger
  BEFORE UPDATE ON claim_projects
  FOR EACH ROW
  EXECUTE FUNCTION disable_auto_sync_on_manual_edit();