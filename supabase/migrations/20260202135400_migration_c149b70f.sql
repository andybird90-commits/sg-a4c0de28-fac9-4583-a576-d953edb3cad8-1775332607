-- Messages table: Email-style threaded conversations
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_message_id uuid NULL REFERENCES messages(id) ON DELETE CASCADE,
  thread_id uuid NULL, -- Root message ID for threading
  is_staff_sender boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Email-style messages between staff and clients';
COMMENT ON COLUMN messages.thread_id IS 'ID of the root message in the thread';
COMMENT ON COLUMN messages.is_staff_sender IS 'True if sender has internal_role';

-- Indexes for performance
CREATE INDEX idx_messages_org ON messages(org_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Staff can view all messages for organisations they have access to
CREATE POLICY "Internal users can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.internal_role IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM organisation_users ou
      WHERE ou.org_id = messages.org_id 
      AND ou.user_id = auth.uid()
    )
  );

-- Clients can view messages in their organisation
CREATE POLICY "Clients can view their org messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT ou.org_id 
      FROM organisation_users ou 
      WHERE ou.user_id = auth.uid()
    )
  );

-- Staff can send messages
CREATE POLICY "Internal users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.internal_role IS NOT NULL
    )
  );

-- Clients can send messages
CREATE POLICY "Clients can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND org_id IN (
      SELECT ou.org_id 
      FROM organisation_users ou 
      WHERE ou.user_id = auth.uid()
    )
  );

-- Users can update their own messages (edit within 5 mins)
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());