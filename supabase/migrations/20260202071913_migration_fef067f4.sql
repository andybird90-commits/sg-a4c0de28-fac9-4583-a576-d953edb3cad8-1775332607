-- Create a very permissive INSERT policy to test
DROP POLICY IF EXISTS "Internal users can create claims" ON claims;

CREATE POLICY "Authenticated users can create claims"
ON claims
FOR INSERT
TO authenticated
WITH CHECK (true);