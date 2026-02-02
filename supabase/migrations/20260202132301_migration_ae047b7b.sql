-- Add missing columns to existing pipeline_entries table for enhanced forecasting
ALTER TABLE pipeline_entries
ADD COLUMN IF NOT EXISTS pipeline_start_date date,
ADD COLUMN IF NOT EXISTS average_filing_lag_days integer,
ADD COLUMN IF NOT EXISTS filing_confidence_score integer,
ADD COLUMN IF NOT EXISTS years_trading integer,
ADD COLUMN IF NOT EXISTS predicted_revenue numeric(12,2),
ADD COLUMN IF NOT EXISTS manual_revenue_override numeric(12,2),
ADD COLUMN IF NOT EXISTS auto_created boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_companies_house_sync timestamp with time zone;

COMMENT ON COLUMN pipeline_entries.pipeline_start_date IS 'Date when work should begin (1 month before filing)';
COMMENT ON COLUMN pipeline_entries.average_filing_lag_days IS 'Average days between year end and filing';
COMMENT ON COLUMN pipeline_entries.filing_confidence_score IS 'Confidence 0-100 based on filing history';
COMMENT ON COLUMN pipeline_entries.years_trading IS 'Years since incorporation';
COMMENT ON COLUMN pipeline_entries.predicted_revenue IS 'Auto-calculated predicted revenue';
COMMENT ON COLUMN pipeline_entries.manual_revenue_override IS 'Manual revenue entry (overrides predicted)';
COMMENT ON COLUMN pipeline_entries.auto_created IS 'True if auto-created by system';