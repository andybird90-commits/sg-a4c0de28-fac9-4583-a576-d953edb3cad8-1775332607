-- Drop the existing foreign key
ALTER TABLE sidekick_project_comments
DROP CONSTRAINT sidekick_project_comments_author_id_fkey;

-- Add new foreign key pointing to profiles table
ALTER TABLE sidekick_project_comments
ADD CONSTRAINT sidekick_project_comments_author_id_fkey
FOREIGN KEY (author_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;