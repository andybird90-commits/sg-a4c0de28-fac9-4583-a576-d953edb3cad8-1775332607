-- ============================================================================
-- 8) CREATE INTERNAL COLLABORATION TABLES
-- ============================================================================

-- Create internal_comments table
CREATE TABLE IF NOT EXISTS internal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('prospect', 'cif', 'claim', 'project', 'task')),
  entity_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE internal_comments IS 'Internal-only comments on various entities (not visible to clients)';
COMMENT ON COLUMN internal_comments.entity_type IS 'Type of entity being commented on';
COMMENT ON COLUMN internal_comments.entity_id IS 'UUID of the entity';

-- Create comment_mentions table
CREATE TABLE IF NOT EXISTS comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES internal_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL
);

COMMENT ON TABLE comment_mentions IS '@mentions in internal comments';

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL
);

COMMENT ON TABLE notifications IS 'User notifications for mentions, assignments, etc.';
COMMENT ON COLUMN notifications.type IS 'Notification type: mention, task_assigned, project_submitted, etc.';
COMMENT ON COLUMN notifications.payload_json IS 'Notification data: {entity_type, entity_id, message, related_ids}';

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_unread 
ON comment_mentions(mentioned_user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE internal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users only for internal_comments
CREATE POLICY "Internal users can view internal comments"
ON internal_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create internal comments"
ON internal_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND author_id = auth.uid()
);

CREATE POLICY "Internal users can update their comments"
ON internal_comments FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can delete their comments"
ON internal_comments FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- RLS: Internal users can view mentions
CREATE POLICY "Internal users can view comment mentions"
ON comment_mentions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create mentions"
ON comment_mentions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Users can update their own mentions"
ON comment_mentions FOR UPDATE
TO authenticated
USING (
  mentioned_user_id = auth.uid()
);

-- RLS: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());