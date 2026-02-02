-- Message recipients: Track who receives each message
CREATE TABLE message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE message_recipients IS 'Track message recipients and read status';

-- Indexes
CREATE INDEX idx_message_recipients_message ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_recipient ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_unread ON message_recipients(recipient_id, is_read, created_at DESC);
CREATE UNIQUE INDEX idx_message_recipients_unique ON message_recipients(message_id, recipient_id);

-- RLS Policies
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;

-- Users can view their own recipient records
CREATE POLICY "Users can view own recipient records"
  ON message_recipients FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- System can create recipient records when messages are sent
CREATE POLICY "System can create recipient records"
  ON message_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can mark their messages as read
CREATE POLICY "Users can update own recipient records"
  ON message_recipients FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());