-- Fix auto_sync_sidekick_to_claim function
DROP FUNCTION IF EXISTS auto_sync_sidekick_to_claim() CASCADE;

CREATE OR REPLACE FUNCTION auto_sync_sidekick_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  target_claim_id UUID;
BEGIN
  SELECT id INTO target_claim_id
  FROM claims
  WHERE org_id = NEW.company_id
    AND status IN ('intake', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_claim_id IS NOT NULL THEN
    INSERT INTO claim_projects (
      claim_id,
      org_id,
      name,
      description,
      rd_theme,
      source_sidekick_project_id,
      auto_synced,
      last_synced_at
    ) VALUES (
      target_claim_id,
      NEW.company_id,
      NEW.name,
      NEW.description,
      NEW.sector,
      NEW.id,
      true,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_sync_sidekick_to_claim
  AFTER INSERT ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_sidekick_to_claim();