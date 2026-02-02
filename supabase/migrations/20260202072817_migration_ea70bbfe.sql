-- Add created_by tracking for each stage and rejection history
ALTER TABLE cif_records
  ADD COLUMN IF NOT EXISTS bdm_section_created_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS tech_section_created_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS financial_section_created_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_to_stage text CHECK (rejected_to_stage IN ('bdm_section', 'tech_feasibility', 'financial_section'));

-- Create index for rejection tracking
CREATE INDEX IF NOT EXISTS idx_cif_records_rejected_by ON cif_records(rejected_by);

COMMENT ON COLUMN cif_records.bdm_section_created_by IS 'User who created/completed the BDM section (Job Board A)';
COMMENT ON COLUMN cif_records.tech_section_created_by IS 'User who created/completed the Tech section (Job Board B)';
COMMENT ON COLUMN cif_records.financial_section_created_by IS 'User who created/completed the Financial section (Job Board C)';
COMMENT ON COLUMN cif_records.rejection_reason IS 'Reason/comments when CIF is rejected and sent back';
COMMENT ON COLUMN cif_records.rejected_by IS 'User who rejected the CIF';
COMMENT ON COLUMN cif_records.rejected_at IS 'Timestamp when CIF was rejected';
COMMENT ON COLUMN cif_records.rejected_to_stage IS 'Which stage the CIF was sent back to after rejection';