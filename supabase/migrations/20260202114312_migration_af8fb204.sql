-- Create correct RLS policies for project_collaborators
CREATE POLICY "Internal users can manage project collaborators"
  ON project_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
    )
  );