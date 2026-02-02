-- Trigger to auto-update pipeline entry calculations when filing history changes
CREATE OR REPLACE FUNCTION update_pipeline_predictions()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_lag INTEGER;
  v_confidence INTEGER;
  v_filing_count INTEGER;
  v_years_trading DECIMAL;
  v_advance_days INTEGER;
BEGIN
  -- Get advance days setting
  SELECT setting_value::INTEGER INTO v_advance_days
  FROM pipeline_settings WHERE setting_key = 'advance_days';
  
  -- Calculate average filing lag
  v_avg_lag := get_average_filing_lag(NEW.org_id);
  
  -- Count filing history
  SELECT COUNT(*) INTO v_filing_count
  FROM companies_house_filings
  WHERE org_id = NEW.org_id AND filing_type = 'accounts';
  
  -- Get years trading from organisation
  SELECT EXTRACT(YEAR FROM AGE(NOW(), incorporation_date))::DECIMAL INTO v_years_trading
  FROM organisations WHERE id = NEW.org_id;
  
  -- Calculate confidence
  v_confidence := calculate_pipeline_confidence(v_filing_count, COALESCE(v_years_trading, 1));
  
  -- Update predictions
  NEW.average_filing_lag_days := v_avg_lag;
  NEW.filing_history_count := v_filing_count;
  NEW.years_trading := v_years_trading;
  NEW.confidence_score := v_confidence;
  
  -- Calculate predicted filing date
  NEW.predicted_filing_date := NEW.year_end_date + (v_avg_lag || ' days')::INTERVAL;
  
  -- Calculate pipeline start date (1 month before predicted filing)
  NEW.pipeline_start_date := NEW.predicted_filing_date - (v_advance_days || ' days')::INTERVAL;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_update_pipeline_predictions ON pipeline_entries;
CREATE TRIGGER trigger_update_pipeline_predictions
  BEFORE INSERT OR UPDATE ON pipeline_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_predictions();