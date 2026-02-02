-- Create correct RLS policies for project_status_history
CREATE POLICY "Internal users can view project status history"
  ON project_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
    )
  );