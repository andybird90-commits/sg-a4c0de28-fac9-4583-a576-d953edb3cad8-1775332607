-- Table to store historical Companies House filing data for pattern analysis
CREATE TABLE IF NOT EXISTS companies_house_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  company_number text NOT NULL,
  
  -- Filing details
  accounts_filing_date date NOT NULL,
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  
  -- Calculated metrics
  filing_lag_days integer GENERATED ALWAYS AS (
    accounts_filing_date - period_end_date
  ) STORED,
  
  -- Metadata
  filing_type text, -- annual, dormant, group, etc.
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_org_filing UNIQUE(org_id, period_end_date)
);

CREATE INDEX IF NOT EXISTS idx_ch_filings_org ON companies_house_filings(org_id);
CREATE INDEX IF NOT EXISTS idx_ch_filings_company ON companies_house_filings(company_number);
CREATE INDEX IF NOT EXISTS idx_ch_filings_date ON companies_house_filings(accounts_filing_date);

COMMENT ON TABLE companies_house_filings IS 'Historical filing data from Companies House for pattern analysis';

-- RLS Policies
ALTER TABLE companies_house_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view filing history"
  ON companies_house_filings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can insert filing history"
  ON companies_house_filings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can update filing history"
  ON companies_house_filings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
    )
  );