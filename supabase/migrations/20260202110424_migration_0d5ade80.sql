-- Step 3: Create ONE-WAY sync function from sidekick projects to claim projects (INSERT only)
CREATE OR REPLACE FUNCTION auto_sync_sidekick_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_claim_id UUID;
  v_rd_theme TEXT;
BEGIN
  -- Find active claim for this organization
  SELECT id INTO v_claim_id
  FROM claims
  WHERE org_id = NEW.company_id
    AND claim_status IN ('intake', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Map sector to rd_theme
  v_rd_theme := COALESCE(NEW.sector, 'Engineering');

  -- If claim exists, create linked claim project
  IF v_claim_id IS NOT NULL THEN
    INSERT INTO claim_projects (
      claim_id,
      org_id,
      name,
      description,
      start_date,
      end_date,
      rd_theme,
      source_sidekick_project_id,
      auto_synced,
      last_synced_at
    ) VALUES (
      v_claim_id,
      NEW.company_id,
      NEW.name,
      NEW.description,
      CURRENT_DATE,
      NULL,
      v_rd_theme,
      NEW.id,
      true,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_sync_sidekick_to_claim ON sidekick_projects;
CREATE TRIGGER auto_sync_sidekick_to_claim
  AFTER INSERT ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_sidekick_to_claim();