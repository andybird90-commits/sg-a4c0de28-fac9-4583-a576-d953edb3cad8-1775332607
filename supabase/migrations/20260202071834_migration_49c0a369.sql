-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Internal users can create claims" ON claims;

-- Create a new policy that allows:
-- 1. Service role (bypasses RLS)
-- 2. Authenticated users who have internal_role set
CREATE POLICY "Internal users and service can create claims" ON claims
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Allow if user has internal_role (staff member)
  -- OR if this is a service role request (auth.uid() IS NULL means service role)
  auth.uid() IS NULL 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND internal_role IS NOT NULL
  )
);