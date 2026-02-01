-- Add timestamp tracking fields to cif_records
ALTER TABLE cif_records
ADD COLUMN IF NOT EXISTS bdm_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tech_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finance_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_last_updated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'bdm_section';

-- Add constraint for current_stage
ALTER TABLE cif_records
DROP CONSTRAINT IF EXISTS cif_records_current_stage_check;

ALTER TABLE cif_records
ADD CONSTRAINT cif_records_current_stage_check 
CHECK (current_stage IN (
  'bdm_section',
  'tech_feasibility', 
  'financial_section',
  'admin_approval',
  'approved',
  'rejected'
));

-- Add comments
COMMENT ON COLUMN cif_records.current_stage IS 'Current workflow stage: bdm_section, tech_feasibility, financial_section, admin_approval, approved, rejected';
COMMENT ON COLUMN cif_records.bdm_last_updated IS 'Timestamp of last update to BDM section';
COMMENT ON COLUMN cif_records.tech_last_updated IS 'Timestamp of last update to Technical section';
COMMENT ON COLUMN cif_records.finance_last_updated IS 'Timestamp of last update to Financial section';
COMMENT ON COLUMN cif_records.admin_last_updated IS 'Timestamp of last update by Admin';