ALTER TABLE claim_projects
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);