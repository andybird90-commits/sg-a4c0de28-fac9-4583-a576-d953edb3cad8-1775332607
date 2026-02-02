-- Drop all the problematic triggers and functions with CASCADE
DROP FUNCTION IF EXISTS sync_project_to_claim() CASCADE;
DROP FUNCTION IF EXISTS sync_sidekick_project_to_claim() CASCADE;
DROP FUNCTION IF EXISTS sync_project_update_to_claim() CASCADE;
DROP FUNCTION IF EXISTS sync_sidekick_project_update_to_claim() CASCADE;
DROP FUNCTION IF EXISTS sync_claim_project_to_source() CASCADE;