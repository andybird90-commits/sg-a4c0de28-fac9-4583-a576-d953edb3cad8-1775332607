-- Step 2: Create function to automatically create claim project when regular project is created
CREATE OR REPLACE FUNCTION sync_project_to_claim()
RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
BEGIN
  -- Find active claim for this organization
  SELECT id, org_id INTO claim_record
  FROM claims
  WHERE org_id = NEW.org_id
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
      source_project_id,
      start_date,
      end_date
    ) VALUES (
      claim_record.id,
      NEW.org_id,
      NEW.name,
      NEW.description,
      NEW.id,
      NEW.start_date,
      NEW.end_date
    )
    ON CONFLICT (claim_id, source_project_id) 
    WHERE source_project_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for projects table
DROP TRIGGER IF EXISTS trigger_sync_project_to_claim ON projects;
CREATE TRIGGER trigger_sync_project_to_claim
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_to_claim();