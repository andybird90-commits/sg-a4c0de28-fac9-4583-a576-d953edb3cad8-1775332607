-- 1. EXTEND ORGANISATIONS TABLE
-- Add Conexa linking columns to existing organisations table
ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS is_conexa_company boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_conexa_company_id uuid REFERENCES organisations(id),
  ADD COLUMN IF NOT EXISTS linked_conexa_company_name text,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_by_user_id uuid REFERENCES auth.users(id);

-- Add index for Conexa company lookups
CREATE INDEX IF NOT EXISTS idx_organisations_conexa ON organisations(is_conexa_company) WHERE is_conexa_company = true;
CREATE INDEX IF NOT EXISTS idx_organisations_linked ON organisations(linked_conexa_company_id) WHERE linked_conexa_company_id IS NOT NULL;

COMMENT ON COLUMN organisations.is_conexa_company IS 'True for companies that are canonical Conexa RD Pro records';
COMMENT ON COLUMN organisations.linked_conexa_company_id IS 'The Conexa company this Sidekick company is linked to';
COMMENT ON COLUMN organisations.sidekick_enabled IS 'Company is allowed to use Sidekick features (shows badge when true AND linked)';