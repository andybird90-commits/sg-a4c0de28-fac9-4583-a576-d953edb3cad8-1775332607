-- Message mentions: Track @mentions in messages
CREATE TABLE message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL
);

COMMENT ON TABLE message_mentions IS '@mentions in messages with read tracking';

-- Indexes
CREATE INDEX idx_message_mentions_message ON message_mentions(message_id);
CREATE INDEX idx_message_mentions_user ON message_mentions(mentioned_user_id);
CREATE INDEX idx_message_mentions_unread ON message_mentions(mentioned_user_id, is_read, created_at DESC);
CREATE UNIQUE INDEX idx_message_mentions_unique ON message_mentions(message_id, mentioned_user_id);

-- RLS Policies
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions where they are mentioned
CREATE POLICY "Users can view their mentions"
  ON message_mentions FOR SELECT
  TO authenticated
  USING (mentioned_user_id = auth.uid());

-- System can create mentions
CREATE POLICY "Authenticated users can create mentions"
  ON message_mentions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can mark their mentions as read
CREATE POLICY "Users can update their mentions"
  ON message_mentions FOR UPDATE
  TO authenticated
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());