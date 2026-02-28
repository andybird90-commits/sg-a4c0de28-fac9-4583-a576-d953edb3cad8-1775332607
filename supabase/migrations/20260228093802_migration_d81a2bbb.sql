CREATE POLICY allow_all_insert_claims
ON claims
FOR INSERT
WITH CHECK (true);