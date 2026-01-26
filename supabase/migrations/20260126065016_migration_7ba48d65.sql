-- Create feasibility_analyses table
CREATE TABLE IF NOT EXISTS feasibility_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Input fields
  idea_description TEXT NOT NULL,
  sector TEXT,
  stage TEXT,
  
  -- AI Response fields
  idea_title TEXT,
  summary TEXT,
  sector_guess TEXT,
  
  -- Technical assessment
  technical_rating TEXT CHECK (technical_rating IN ('low', 'medium', 'high')),
  technical_reasoning TEXT,
  technical_constraints JSONB DEFAULT '[]'::jsonb,
  
  -- Commercial assessment
  commercial_rating TEXT CHECK (commercial_rating IN ('low', 'medium', 'high')),
  commercial_reasoning TEXT,
  target_customers JSONB DEFAULT '[]'::jsonb,
  revenue_ideas JSONB DEFAULT '[]'::jsonb,
  
  -- Delivery assessment
  delivery_complexity TEXT CHECK (delivery_complexity IN ('low', 'medium', 'high')),
  delivery_timeframe_months INTEGER,
  delivery_dependencies JSONB DEFAULT '[]'::jsonb,
  
  -- Risk & Regulatory
  notable_risks JSONB DEFAULT '[]'::jsonb,
  regulatory_issues JSONB DEFAULT '[]'::jsonb,
  
  -- R&D Tax
  rd_tax_flag TEXT CHECK (rd_tax_flag IN ('yes', 'maybe', 'no')),
  rd_tax_reasoning TEXT,
  
  -- Next actions
  next_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feasibility_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own organisation's analyses
CREATE POLICY "Users can view own organisation analyses" 
  ON feasibility_analyses FOR SELECT 
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
    )
  );

-- Users can create analyses for their organisation
CREATE POLICY "Users can create analyses" 
  ON feasibility_analyses FOR INSERT 
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX idx_feasibility_organisation ON feasibility_analyses(organisation_id);
CREATE INDEX idx_feasibility_user ON feasibility_analyses(user_id);
CREATE INDEX idx_feasibility_created ON feasibility_analyses(created_at DESC);