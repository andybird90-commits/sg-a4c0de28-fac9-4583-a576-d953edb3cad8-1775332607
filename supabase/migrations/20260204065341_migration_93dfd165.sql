-- Add DELETE policy for cif_state_changes table
CREATE POLICY "Internal users can delete state changes" 
ON cif_state_changes
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