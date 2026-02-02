-- Step 1: Add deleted_at column for soft deletes
ALTER TABLE claim_projects
ADD COLUMN deleted_at timestamp with time zone NULL;