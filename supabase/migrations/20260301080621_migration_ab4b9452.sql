CREATE POLICY "server_anon_can_view_claims"
ON claims
FOR SELECT
TO anon
USING (true);