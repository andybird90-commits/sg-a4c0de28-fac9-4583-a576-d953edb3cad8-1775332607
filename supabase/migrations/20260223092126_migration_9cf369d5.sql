ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS ai_research_data jsonb,
ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;