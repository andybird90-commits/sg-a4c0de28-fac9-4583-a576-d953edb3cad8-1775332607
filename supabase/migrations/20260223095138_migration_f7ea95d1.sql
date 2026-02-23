CREATE POLICY "Internal users can delete prospects"
ON prospects
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