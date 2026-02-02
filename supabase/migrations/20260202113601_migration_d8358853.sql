-- Step 4: Create project_comments table for feedback/revision requests
CREATE TABLE IF NOT EXISTS project_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_project_id UUID NOT NULL REFERENCES claim_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('client_feedback', 'team_note', 'revision_request', 'status_change', 'general')),
  comment_text TEXT NOT NULL,
  section_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(claim_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_comments_user ON project_comments(user_id);