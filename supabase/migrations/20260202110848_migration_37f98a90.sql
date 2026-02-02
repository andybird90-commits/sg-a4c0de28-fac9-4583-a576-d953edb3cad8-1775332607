-- Fix the trigger functions to use correct column name 'status' instead of 'claim_status'
-- Drop and recreate auto_sync_project_to_claim function
DROP FUNCTION IF EXISTS auto_sync_project_to_claim() CASCADE;

CREATE OR REPLACE FUNCTION auto_sync_project_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  target_claim_id UUID;
BEGIN
  SELECT id INTO target_claim_id
  FROM claims
  WHERE org_id = NEW.org_id
    AND status IN ('intake', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_claim_id IS NOT NULL THEN
    INSERT INTO claim_projects (
      claim_id,
      org_id,
      name,
      description,
      source_project_id,
      auto_synced,
      last_synced_at
    ) VALUES (
      target_claim_id,
      NEW.org_id,
      NEW.name,
      NEW.description,
      NEW.id,
      true,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_sync_project_to_claim
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_project_to_claim();