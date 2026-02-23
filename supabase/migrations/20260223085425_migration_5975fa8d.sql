CREATE POLICY "Internal users can view memberships"
ON organisation_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);