-- Step 6: Create function to automatically calculate due_date (3 days from submission)
CREATE OR REPLACE FUNCTION set_due_date_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workflow_status = 'submitted_to_team' AND OLD.workflow_status != 'submitted_to_team' THEN
    NEW.submitted_to_team_at = NOW();
    NEW.due_date = NOW() + INTERVAL '3 days';
  END IF;
  
  IF NEW.workflow_status = 'team_in_progress' AND OLD.workflow_status != 'team_in_progress' THEN
    NEW.team_started_at = NOW();
  END IF;
  
  IF NEW.workflow_status = 'awaiting_client_review' AND OLD.workflow_status != 'awaiting_client_review' THEN
    NEW.sent_to_client_at = NOW();
  END IF;
  
  IF NEW.workflow_status = 'approved' AND OLD.workflow_status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  
  IF NEW.workflow_status = 'cancelled' AND OLD.workflow_status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  IF NEW.workflow_status = 'revision_requested' THEN
    NEW.revision_count = COALESCE(NEW.revision_count, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_due_date ON claim_projects;
CREATE TRIGGER trigger_set_due_date
  BEFORE UPDATE ON claim_projects
  FOR EACH ROW
  EXECUTE FUNCTION set_due_date_on_submission();