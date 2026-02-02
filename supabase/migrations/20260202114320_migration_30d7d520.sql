-- Create correct RLS policies for project_comments
CREATE POLICY "Internal users can manage project comments"
  ON project_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
    )
  );