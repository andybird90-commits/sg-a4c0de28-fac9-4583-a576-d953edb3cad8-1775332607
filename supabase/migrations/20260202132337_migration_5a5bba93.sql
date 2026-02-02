-- Function to auto-create or update pipeline entry when claim is created/updated
CREATE OR REPLACE FUNCTION sync_pipeline_from_claim()
RETURNS TRIGGER AS $$
DECLARE
  v_org organisations%ROWTYPE;
  v_avg_lag integer;
  v_confidence integer;
  v_years_trading integer;
  v_predicted_filing date;
  v_pipeline_date date;
BEGIN
  -- Get organisation details
  SELECT * INTO v_org FROM organisations WHERE id = NEW.org_id;
  
  -- Calculate years trading (if we have incorporation date)
  IF v_org.linked_at IS NOT NULL THEN
    v_years_trading := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_org.linked_at));
  ELSE
    v_years_trading := 3; -- Default assumption
  END IF;
  
  -- Get filing pattern
  v_avg_lag := get_average_filing_lag(NEW.org_id);
  v_confidence := calculate_filing_confidence(NEW.org_id, v_years_trading);
  
  -- Calculate predicted filing date (period_end + average lag)
  IF NEW.period_end IS NOT NULL THEN
    v_predicted_filing := NEW.period_end + (v_avg_lag || ' days')::interval;
    -- Pipeline starts 1 month before predicted filing
    v_pipeline_date := v_predicted_filing - interval '1 month';
  END IF;
  
  -- Upsert pipeline entry
  INSERT INTO pipeline_entries (
    org_id,
    claim_id,
    period_label,
    expected_accounts_filing_date,
    pipeline_start_date,
    average_filing_lag_days,
    filing_confidence_score,
    years_trading,
    probability,
    auto_created,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.org_id,
    NEW.id,
    'FY' || NEW.claim_year,
    v_predicted_filing,
    v_pipeline_date,
    v_avg_lag,
    v_confidence,
    v_years_trading,
    70, -- Default 70% probability
    true,
    COALESCE(NEW.bd_owner_id, NEW.created_at::text::uuid), -- Use BD owner or fallback
    now(),
    now()
  )
  ON CONFLICT (org_id, claim_id) 
  DO UPDATE SET
    expected_accounts_filing_date = EXCLUDED.expected_accounts_filing_date,
    pipeline_start_date = EXCLUDED.pipeline_start_date,
    average_filing_lag_days = EXCLUDED.average_filing_lag_days,
    filing_confidence_score = EXCLUDED.filing_confidence_score,
    years_trading = EXCLUDED.years_trading,
    updated_at = now()
  WHERE pipeline_entries.auto_created = true; -- Only update auto-created entries
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync pipeline when claim is created/updated
DROP TRIGGER IF EXISTS trigger_sync_pipeline_from_claim ON claims;
CREATE TRIGGER trigger_sync_pipeline_from_claim
  AFTER INSERT OR UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION sync_pipeline_from_claim();

COMMENT ON FUNCTION sync_pipeline_from_claim IS 'Auto-create/update pipeline entry when claim is created or updated';