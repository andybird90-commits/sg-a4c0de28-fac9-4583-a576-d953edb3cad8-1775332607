CREATE POLICY "server_can_insert_project_status_history"
ON project_status_history
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "clients_can_insert_project_status_history"
ON project_status_history
FOR INSERT
TO authenticated
WITH CHECK (true);