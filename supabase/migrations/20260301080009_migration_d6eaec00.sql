CREATE POLICY "server_anon_can_link_sidekick_projects_to_claims"
ON sidekick_projects
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);