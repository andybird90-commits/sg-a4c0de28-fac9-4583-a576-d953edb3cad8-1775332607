-- Function to auto-set thread_id on insert
CREATE OR REPLACE FUNCTION set_message_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a reply, use parent's thread_id or parent_id as thread_id
  IF NEW.parent_message_id IS NOT NULL THEN
    SELECT COALESCE(thread_id, id) INTO NEW.thread_id
    FROM messages
    WHERE id = NEW.parent_message_id;
  ELSE
    -- This is a new thread, set thread_id to its own id
    NEW.thread_id := NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_message_thread_id
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_thread_id();

COMMENT ON FUNCTION set_message_thread_id IS 'Auto-set thread_id for message threading';