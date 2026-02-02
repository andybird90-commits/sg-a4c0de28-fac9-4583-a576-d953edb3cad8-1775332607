-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Internal users and service can create claims" ON claims;

-- Verify only the permissive policy remains
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'claims' AND cmd = 'INSERT';