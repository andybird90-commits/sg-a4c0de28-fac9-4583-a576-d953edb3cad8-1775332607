-- Step 7: Create function to log status changes to history table
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.workflow_status IS DISTINCT FROM NEW.workflow_status THEN
    INSERT INTO project_status_history (
      claim_project_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.workflow_status,
      NEW.workflow_status,
      NEW.updated_by,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_status_change ON claim_projects;
CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE ON claim_projects
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();