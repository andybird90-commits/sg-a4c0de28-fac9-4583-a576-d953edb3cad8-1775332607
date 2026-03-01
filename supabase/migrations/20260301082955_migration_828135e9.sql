CREATE POLICY "server_can_update_claim_projects"
ON claim_projects
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);