-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Internal users can create claims" ON claims;

-- Create new policy that allows internal staff to create claims for any org
CREATE POLICY "Internal users can create claims"
ON claims FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.internal_role IS NOT NULL
  )
);