-- Add linked_claim_id to cif_records to track auto-created claims
ALTER TABLE cif_records
ADD COLUMN IF NOT EXISTS linked_claim_id UUID REFERENCES claims(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_cif_records_linked_claim ON cif_records(linked_claim_id);

-- Add comment
COMMENT ON COLUMN cif_records.linked_claim_id IS 'Claim automatically created when CIF is approved by admin';