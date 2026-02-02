-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Internal users can create claims" ON claims;

-- Create a simpler INSERT policy that checks internal_role more directly
CREATE POLICY "Internal users can create claims" ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if the current user has an internal_role set
  (SELECT internal_role FROM profiles WHERE id = auth.uid()) IS NOT NULL
);