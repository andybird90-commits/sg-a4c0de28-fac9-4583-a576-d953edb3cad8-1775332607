-- Update CIF records table to add feasibility-related fields
ALTER TABLE cif_records 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_reason text,
ADD COLUMN IF NOT EXISTS archived_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add new stage values for feasibility workflow
ALTER TABLE cif_records DROP CONSTRAINT IF EXISTS cif_records_current_stage_check;
ALTER TABLE cif_records ADD CONSTRAINT cif_records_current_stage_check 
CHECK (current_stage IN (
  'bdm_section', 
  'awaiting_feasibility', 
  'feasibility_booked', 
  'tech_feasibility',
  'feasibility_complete_go',
  'feasibility_complete_no_rd_archived',
  'financial_section', 
  'admin_approval', 
  'approved', 
  'rejected'
));

CREATE INDEX IF NOT EXISTS idx_cif_records_archived ON cif_records(archived);
CREATE INDEX IF NOT EXISTS idx_cif_records_stage ON cif_records(current_stage);

COMMENT ON COLUMN cif_records.archived IS 'Whether CIF is archived (soft delete)';
COMMENT ON COLUMN cif_records.archived_reason IS 'Reason for archiving CIF';