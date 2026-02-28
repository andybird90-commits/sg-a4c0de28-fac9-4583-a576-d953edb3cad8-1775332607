ALTER TABLE claims
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID REFERENCES profiles(id);

CREATE POLICY authenticated_can_view_all_claims
ON claims
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY authenticated_can_update_all_claims
ON claims
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY authenticated_can_delete_all_claims
ON claims
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);