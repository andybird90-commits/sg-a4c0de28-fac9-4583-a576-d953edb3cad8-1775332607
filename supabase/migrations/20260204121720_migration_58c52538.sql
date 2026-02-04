-- Add new column for structured AI research data
ALTER TABLE cif_records 
ADD COLUMN ai_research_data JSONB;

-- Add comment to explain the field
COMMENT ON COLUMN cif_records.ai_research_data IS 'Structured JSON data from AI company research including business intelligence and feasibility analysis';