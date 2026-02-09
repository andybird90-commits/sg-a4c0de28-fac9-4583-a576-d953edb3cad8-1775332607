-- Update notifications type constraint to include feasibility booking
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'mention', 
  'task_assigned', 
  'project_submitted', 
  'feasibility_booking_request',
  'feasibility_outcome',
  'cif_status_change'
));

COMMENT ON COLUMN notifications.type IS 'Notification type: mention, task_assigned, project_submitted, feasibility_booking_request, feasibility_outcome, cif_status_change';