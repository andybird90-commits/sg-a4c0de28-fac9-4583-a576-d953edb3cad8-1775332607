-- Add BDM Section A fields to cif_records
ALTER TABLE cif_records
ADD COLUMN IF NOT EXISTS business_background TEXT,
ADD COLUMN IF NOT EXISTS project_overview TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS rd_themes TEXT[],
ADD COLUMN IF NOT EXISTS expected_feasibility_date DATE;

-- Add comments
COMMENT ON COLUMN cif_records.business_background IS 'BDM Section A: Business background and context';
COMMENT ON COLUMN cif_records.project_overview IS 'BDM Section A: High-level R&D project overview';
COMMENT ON COLUMN cif_records.rd_themes IS 'BDM Section A: Array of R&D themes/focus areas';