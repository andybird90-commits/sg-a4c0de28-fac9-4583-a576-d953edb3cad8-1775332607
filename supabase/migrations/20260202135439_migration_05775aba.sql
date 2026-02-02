-- Function to create notifications for message mentions
CREATE OR REPLACE FUNCTION notify_message_mentions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for each mention
  INSERT INTO notifications (user_id, type, payload_json)
  SELECT 
    NEW.mentioned_user_id,
    'message_mention',
    jsonb_build_object(
      'message_id', NEW.message_id,
      'mentioned_by', (SELECT sender_id FROM messages WHERE id = NEW.message_id),
      'message_subject', (SELECT subject FROM messages WHERE id = NEW.message_id),
      'entity_type', 'message',
      'entity_id', NEW.message_id
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_message_mentions
  AFTER INSERT ON message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_mentions();

COMMENT ON FUNCTION notify_message_mentions IS 'Create notifications when users are @mentioned in messages';