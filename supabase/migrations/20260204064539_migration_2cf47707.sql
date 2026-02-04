-- Add DELETE policy for cif_records table
-- Allow internal users with admin role to delete CIF records
CREATE POLICY "Internal admins can delete cif_records"
ON cif_records
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.internal_role = 'admin'
  )
);