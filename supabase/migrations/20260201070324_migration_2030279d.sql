-- Add Companies House lookup fields to prospects table
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS company_status TEXT,
ADD COLUMN IF NOT EXISTS registered_address TEXT,
ADD COLUMN IF NOT EXISTS sic_codes TEXT[],
ADD COLUMN IF NOT EXISTS incorporation_date DATE;

-- Add comment explaining the new fields
COMMENT ON COLUMN prospects.company_status IS 'Companies House status: active, dissolved, liquidation, etc.';
COMMENT ON COLUMN prospects.registered_address IS 'Full registered address from Companies House';
COMMENT ON COLUMN prospects.sic_codes IS 'Array of SIC codes from Companies House';
COMMENT ON COLUMN prospects.incorporation_date IS 'Date of incorporation from Companies House';