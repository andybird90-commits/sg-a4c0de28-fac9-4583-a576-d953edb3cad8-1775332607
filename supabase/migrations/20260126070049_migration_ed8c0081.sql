-- 2. CREATE SIDEKICK_PROJECTS TABLE
-- Separate from existing 'projects' table which is for RD claims
CREATE TABLE IF NOT EXISTS sidekick_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  sector text,
  stage text, -- 'idea', 'prototype', 'in_production'
  status text NOT NULL DEFAULT 'draft',
  conexa_project_id uuid, -- id in Conexa RD Pro once transferred
  ready_for_review_at timestamptz,
  reviewed_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT sidekick_projects_status_check CHECK (
    status IN ('draft', 'ready_for_review', 'in_review', 'needs_changes', 'rejected', 'transferred')
  ),
  CONSTRAINT sidekick_projects_stage_check CHECK (
    stage IS NULL OR stage IN ('idea', 'prototype', 'in_production', 'early_stage', 'growth')
  )
);

-- Indexes for performance
CREATE INDEX idx_sidekick_projects_company ON sidekick_projects(company_id);
CREATE INDEX idx_sidekick_projects_status ON sidekick_projects(status);
CREATE INDEX idx_sidekick_projects_created_by ON sidekick_projects(created_by);
CREATE INDEX idx_sidekick_projects_review_ready ON sidekick_projects(ready_for_review_at) WHERE status = 'ready_for_review';

-- Enable RLS
ALTER TABLE sidekick_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client users
CREATE POLICY "Client users can view their company projects"
  ON sidekick_projects FOR SELECT
  USING (
    company_id IN (
      SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Client users can create projects for their company"
  ON sidekick_projects FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Client users can update own draft/needs_changes projects"
  ON sidekick_projects FOR UPDATE
  USING (
    created_by = auth.uid()
    AND status IN ('draft', 'needs_changes')
    AND company_id IN (
      SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Client users can delete own draft projects"
  ON sidekick_projects FOR DELETE
  USING (
    created_by = auth.uid()
    AND status = 'draft'
    AND company_id IN (
      SELECT org_id FROM organisation_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for RD staff (assuming 'rd_staff' role or admin with special flag)
-- For now, using a simple check - RD staff will be identified by being in a special org or having admin role
-- This can be refined based on existing auth patterns

COMMENT ON TABLE sidekick_projects IS 'Sidekick project containers for ideas, feasibility, and evidence - separate from RD claim projects';