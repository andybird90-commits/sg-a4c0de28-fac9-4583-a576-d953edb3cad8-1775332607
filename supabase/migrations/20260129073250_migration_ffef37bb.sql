-- ============================================================================
-- 3) EXTEND SIDEKICK_PROJECT_COMMENTS FOR SHARED MESSAGING
-- ============================================================================

-- Add messaging columns to sidekick_project_comments
ALTER TABLE sidekick_project_comments
ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'sidekick' 
  CHECK (origin IN ('sidekick', 'internal')),
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'client_visible' 
  CHECK (visibility IN ('client_visible', 'internal_only')),
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'message' 
  CHECK (type IN ('message', 'question', 'answer', 'upload_request', 'note'));

COMMENT ON COLUMN sidekick_project_comments.origin IS 'Source of comment: sidekick (client) or internal (RD team)';
COMMENT ON COLUMN sidekick_project_comments.visibility IS 'client_visible: shown to client; internal_only: RD team only';
COMMENT ON COLUMN sidekick_project_comments.type IS 'Type of message: message, question, answer, upload_request, note';

-- Add RLS policy for internal users to read all comments
CREATE POLICY "Internal users can view all project comments"
ON sidekick_project_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM sidekick_projects sp
    JOIN organisation_users ou ON ou.org_id = sp.company_id
    WHERE sp.id = sidekick_project_comments.project_id
      AND ou.user_id = auth.uid()
  )
);

-- Add RLS policy for internal users to insert comments
CREATE POLICY "Internal users can create project comments"
ON sidekick_project_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM sidekick_projects sp
    JOIN organisation_users ou ON ou.org_id = sp.company_id
    WHERE sp.id = sidekick_project_comments.project_id
      AND ou.user_id = auth.uid()
  )
);