ALTER TABLE claims
ADD COLUMN IF NOT EXISTS hmrc_responses jsonb DEFAULT '[]'::jsonb;