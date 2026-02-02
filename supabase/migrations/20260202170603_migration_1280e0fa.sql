ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS entity_type text CHECK (entity_type IN ('organisation', 'project', 'evidence', 'claim', 'cif')),
ADD COLUMN IF NOT EXISTS entity_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);