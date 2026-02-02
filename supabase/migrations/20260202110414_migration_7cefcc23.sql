-- Step 2: Create ONE-WAY sync function from regular projects to claim projects (INSERT only)
CREATE OR REPLACE FUNCTION auto_sync_project_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_claim_id UUID;
BEGIN
  -- Find active claim for this organization
  SELECT id INTO v_claim_id
  FROM claims
  WHERE org_id = NEW.org_id
    AND claim_status IN ('intake', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

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
      source_project_id,
      auto_synced,
      last_synced_at
    ) VALUES (
      v_claim_id,
      NEW.org_id,
      NEW.name,
      NEW.description,
      CURRENT_DATE,
      NULL,
      'Engineering',
      NEW.id,
      true,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_sync_project_to_claim ON projects;
CREATE TRIGGER auto_sync_project_to_claim
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_project_to_claim();