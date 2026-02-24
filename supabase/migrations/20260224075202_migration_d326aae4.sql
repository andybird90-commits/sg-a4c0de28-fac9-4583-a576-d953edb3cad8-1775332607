CREATE TABLE IF NOT EXISTS public.pipeline_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL
);

ALTER TABLE public.pipeline_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_settings'
  ) THEN
    CREATE POLICY "Internal staff can manage pipeline settings"
    ON public.pipeline_settings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      )
    );
  END IF;
END $$;

INSERT INTO public.pipeline_settings (setting_key, setting_value)
VALUES ('advance_days', '30')
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_pipeline_predictions()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_avg_lag INTEGER;
  v_confidence INTEGER;
  v_filing_count INTEGER;
  v_years_trading DECIMAL;
  v_advance_days INTEGER;
BEGIN
  -- Get advance days setting, defaulting to 30 if not found
  SELECT COALESCE(setting_value::INTEGER, 30) INTO v_advance_days
  FROM pipeline_settings
  WHERE setting_key = 'advance_days';

  IF v_advance_days IS NULL THEN
    v_advance_days := 30;
  END IF;

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
  v_confidence := calculate_pipeline_confidence(
    v_filing_count,
    COALESCE(v_years_trading, 1)
  );

  -- Update predictions
  NEW.average_filing_lag_days := v_avg_lag;
  NEW.filing_history_count := v_filing_count;
  NEW.years_trading := v_years_trading;
  NEW.confidence_score := v_confidence;

  -- Calculate predicted filing date
  NEW.predicted_filing_date :=
    NEW.year_end_date + (v_avg_lag || ' days')::INTERVAL;

  -- Calculate pipeline start date using advance_days
  NEW.pipeline_start_date :=
    NEW.predicted_filing_date - (v_advance_days || ' days')::INTERVAL;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$function$;