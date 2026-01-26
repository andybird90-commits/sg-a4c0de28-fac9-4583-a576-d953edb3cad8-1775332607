-- 5. CREATE SIDEKICK_PROJECT_COMMENTS TABLE
-- For review feedback between clients and RD staff
CREATE TABLE IF NOT EXISTS sidekick_project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES sidekick_projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  author_role text NOT NULL, -- 'client' or 'rd_staff'
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT sidekick_comments_author_role_check CHECK (
    author_role IN ('client', 'rd_staff')
  ),
  CONSTRAINT sidekick_comments_body_not_empty CHECK (
    length(trim(body)) > 0
  )
);

-- Indexes
CREATE INDEX idx_sidekick_comments_project ON sidekick_project_comments(project_id);
CREATE INDEX idx_sidekick_comments_author ON sidekick_project_comments(author_id);
CREATE INDEX idx_sidekick_comments_created ON sidekick_project_comments(created_at DESC);

-- Enable RLS
ALTER TABLE sidekick_project_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - both clients and staff can view comments
CREATE POLICY "Users can view comments for their projects"
  ON sidekick_project_comments FOR SELECT
  USING (
    project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      JOIN organisation_users ou ON ou.org_id = sp.company_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments for their projects"
  ON sidekick_project_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND project_id IN (
      SELECT sp.id FROM sidekick_projects sp
      JOIN organisation_users ou ON ou.org_id = sp.company_id
      WHERE ou.user_id = auth.uid()
    )
  );

COMMENT ON TABLE sidekick_project_comments IS 'Comments and feedback for Sidekick project reviews between clients and RD staff';