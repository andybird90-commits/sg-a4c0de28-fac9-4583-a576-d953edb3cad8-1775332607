-- Step 1: Drop the existing foreign key constraint
ALTER TABLE cif_records 
DROP CONSTRAINT IF EXISTS cif_records_section2_feasibility_id_fkey;

-- Step 2: Recreate the foreign key with ON DELETE SET NULL
ALTER TABLE cif_records 
ADD CONSTRAINT cif_records_section2_feasibility_id_fkey 
FOREIGN KEY (section2_feasibility_id) 
REFERENCES feasibility_analyses(id) 
ON DELETE SET NULL;

-- Step 3: Add DELETE policy for feasibility_analyses (for internal users/admins)
CREATE POLICY "Internal users can delete feasibility analyses" 
ON feasibility_analyses 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.internal_role IS NOT NULL
  )
);