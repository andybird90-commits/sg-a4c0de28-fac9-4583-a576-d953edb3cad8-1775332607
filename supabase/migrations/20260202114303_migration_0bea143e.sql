-- Fix all RLS policies with correct table structure
-- Drop all problematic policies first
DROP POLICY IF EXISTS "Users can manage project collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Users can manage project comments" ON project_comments;
DROP POLICY IF EXISTS "Users can view project status history" ON project_status_history;