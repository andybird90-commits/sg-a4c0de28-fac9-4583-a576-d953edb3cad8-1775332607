-- Drop all existing policies on claims table
DROP POLICY IF EXISTS "Authenticated users can create claims" ON claims;
DROP POLICY IF EXISTS "Internal users and service can create claims" ON claims;
DROP POLICY IF EXISTS "Internal users can update claims" ON claims;
DROP POLICY IF EXISTS "Internal users can view claims" ON claims;

-- Create simple permissive policies for all operations
CREATE POLICY "Allow authenticated INSERT" 
ON claims 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated SELECT" 
ON claims 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated UPDATE" 
ON claims 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated DELETE" 
ON claims 
FOR DELETE 
TO authenticated 
USING (true);

-- Verify the new policies
SELECT policyname, cmd, permissive, qual::text as using_clause, with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'claims'
ORDER BY cmd, policyname;