-- Step 3: Create function to automatically create claim project when sidekick project is created
CREATE OR REPLACE FUNCTION sync_sidekick_project_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
BEGIN
  -- Find active claim for this organization (company_id for sidekick_projects)
  SELECT id, org_id INTO claim_record
  FROM claims
  WHERE org_id = NEW.company_id
    AND status IN ('intake', 'in_progress', 'review')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If claim exists, create claim project
  IF claim_record.id IS NOT NULL THEN
    INSERT INTO claim_projects (
      claim_id,
      org_id,
      name,
      description,
      source_sidekick_project_id,
      rd_theme
    ) VALUES (
      claim_record.id,
      NEW.company_id,
      NEW.name,
      NEW.description,
      NEW.id,
      NEW.sector
    )
    ON CONFLICT (claim_id, source_sidekick_project_id) 
    WHERE source_sidekick_project_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for sidekick_projects table
DROP TRIGGER IF EXISTS trigger_sync_sidekick_project_to_claim ON sidekick_projects;
CREATE TRIGGER trigger_sync_sidekick_project_to_claim
  AFTER INSERT ON sidekick_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_sidekick_project_to_claim();