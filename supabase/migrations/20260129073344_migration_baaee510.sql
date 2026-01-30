-- ============================================================================
-- 11) ADD HELPFUL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for faster queries on new tables
CREATE INDEX IF NOT EXISTS idx_sidekick_projects_claim_id 
ON sidekick_projects(claim_id) WHERE claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sidekick_projects_status 
ON sidekick_projects(status);

CREATE INDEX IF NOT EXISTS idx_sidekick_project_comments_visibility 
ON sidekick_project_comments(visibility);

CREATE INDEX IF NOT EXISTS idx_engagements_org_id 
ON engagements(org_id);

CREATE INDEX IF NOT EXISTS idx_claims_org_id_status 
ON claims(org_id, status);

CREATE INDEX IF NOT EXISTS idx_claims_engagement_id 
ON claims(engagement_id) WHERE engagement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_status 
ON prospects(status);

CREATE INDEX IF NOT EXISTS idx_prospects_bd_owner 
ON prospects(bd_owner_id);

CREATE INDEX IF NOT EXISTS idx_cif_records_prospect_id 
ON cif_records(prospect_id);

CREATE INDEX IF NOT EXISTS idx_cif_records_status 
ON cif_records(cif_status);

CREATE INDEX IF NOT EXISTS idx_cif_documents_cif_id 
ON cif_documents(cif_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_entries_org_id 
ON pipeline_entries(org_id);

CREATE INDEX IF NOT EXISTS idx_internal_comments_entity 
ON internal_comments(entity_type, entity_id);

-- Update updated_at timestamp function for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON engagements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cif_records_updated_at BEFORE UPDATE ON cif_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_entries_updated_at BEFORE UPDATE ON pipeline_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timesheet_entries_updated_at BEFORE UPDATE ON timesheet_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();