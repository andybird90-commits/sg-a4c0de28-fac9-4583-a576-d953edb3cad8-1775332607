-- Add Financial Section fields to cif_records
ALTER TABLE cif_records
ADD COLUMN IF NOT EXISTS financial_year TEXT,
ADD COLUMN IF NOT EXISTS staff_cost_estimate NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS subcontractor_estimate NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS consumables_estimate NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS software_estimate NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS apportionment_assumptions TEXT,
ADD COLUMN IF NOT EXISTS accountant_name TEXT,
ADD COLUMN IF NOT EXISTS accountant_firm TEXT,
ADD COLUMN IF NOT EXISTS accountant_email TEXT,
ADD COLUMN IF NOT EXISTS accountant_phone TEXT,
ADD COLUMN IF NOT EXISTS ready_to_submit BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN cif_records.financial_year IS 'Financial Section: Relevant financial year(s)';
COMMENT ON COLUMN cif_records.ready_to_submit IS 'Financial Section: Ready to submit to HMRC';