-- Add feasibility fields to track technical assessment details
ALTER TABLE feasibility_analyses
ADD COLUMN IF NOT EXISTS feasibility_status TEXT,
ADD COLUMN IF NOT EXISTS estimated_claim_band TEXT,
ADD COLUMN IF NOT EXISTS risk_rating TEXT,
ADD COLUMN IF NOT EXISTS notes_for_finance TEXT,
ADD COLUMN IF NOT EXISTS missing_information_flags TEXT[];

-- Add constraints
ALTER TABLE feasibility_analyses
DROP CONSTRAINT IF EXISTS feasibility_analyses_feasibility_status_check;

ALTER TABLE feasibility_analyses
ADD CONSTRAINT feasibility_analyses_feasibility_status_check 
CHECK (feasibility_status IN ('qualified', 'not_qualified', 'needs_more_info'));

ALTER TABLE feasibility_analyses
DROP CONSTRAINT IF EXISTS feasibility_analyses_estimated_claim_band_check;

ALTER TABLE feasibility_analyses
ADD CONSTRAINT feasibility_analyses_estimated_claim_band_check 
CHECK (estimated_claim_band IN ('0-25k', '25k-50k', '50k-100k', '100k-250k', '250k+'));

ALTER TABLE feasibility_analyses
DROP CONSTRAINT IF EXISTS feasibility_analyses_risk_rating_check;

ALTER TABLE feasibility_analyses
ADD CONSTRAINT feasibility_analyses_risk_rating_check 
CHECK (risk_rating IN ('low', 'medium', 'high'));

-- Add comments
COMMENT ON COLUMN feasibility_analyses.feasibility_status IS 'Technical assessment result: qualified, not_qualified, needs_more_info';
COMMENT ON COLUMN feasibility_analyses.estimated_claim_band IS 'Estimated claim value band';
COMMENT ON COLUMN feasibility_analyses.risk_rating IS 'Risk assessment: low, medium, high';
COMMENT ON COLUMN feasibility_analyses.notes_for_finance IS 'Technical notes for finance team';
COMMENT ON COLUMN feasibility_analyses.missing_information_flags IS 'Array of missing information items';