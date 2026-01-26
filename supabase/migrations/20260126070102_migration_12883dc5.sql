-- 4. CREATE SIDEKICK_EVIDENCE_ITEMS TABLE
-- New evidence structure specifically for Sidekick projects with review workflow features
CREATE TABLE IF NOT EXISTS sidekick_evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES sidekick_projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL, -- 'note', 'file', 'link'
  title text,
  body text, -- for notes / descriptions
  file_path text, -- Supabase Storage path for files
  external_url text, -- for links
  tags text[],
  sidekick_visible boolean NOT NULL DEFAULT true,
  rd_internal_only boolean NOT NULL DEFAULT false, -- RD staff internal notes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT sidekick_evidence_type_check CHECK (
    type IN ('note', 'file', 'link')
  )
);

-- Indexes
CREATE INDEX idx_sidekick_evidence_project ON sidekick_evidence_items(project_id);
CREATE INDEX idx_sidekick_evidence_created_by ON sidekick_evidence_items(created_by);
CREATE INDEX idx_sidekick_evidence_type ON sidekick_evidence_items(type);
CREATE INDEX idx_sidekick_evidence_rd_internal ON sidekick_evidence_items(rd_internal_only) WHERE rd_internal_only = true;

-- Enable RLS
ALTER TABLE sidekick_evidence_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client users
CREATE POLICY "Client users can view non-internal evidence for their projects"
  ON sidekick_evidence_items FOR SELECT
  USING (
    rd_internal_only = false
    AND project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      JOIN organisation_users ou ON ou.org_id = sp.company_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Client users can create evidence for their projects"
  ON sidekick_evidence_items FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND rd_internal_only = false
    AND project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      JOIN organisation_users ou ON ou.org_id = sp.company_id
      WHERE ou.user_id = auth.uid()
      AND sp.status IN ('draft', 'needs_changes')
    )
  );

CREATE POLICY "Client users can update own evidence in draft projects"
  ON sidekick_evidence_items FOR UPDATE
  USING (
    created_by = auth.uid()
    AND rd_internal_only = false
    AND project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      WHERE sp.status IN ('draft', 'needs_changes')
      AND sp.company_id IN (
        SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Client users can delete own evidence in draft projects"
  ON sidekick_evidence_items FOR DELETE
  USING (
    created_by = auth.uid()
    AND rd_internal_only = false
    AND project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      WHERE sp.status = 'draft'
      AND sp.company_id IN (
        SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sidekick_evidence_updated_at ON sidekick_evidence_items;
CREATE TRIGGER update_sidekick_evidence_updated_at
  BEFORE UPDATE ON sidekick_evidence_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sidekick_evidence_items IS 'Evidence items for Sidekick projects with RD staff review features';