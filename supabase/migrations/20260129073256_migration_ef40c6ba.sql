-- ============================================================================
-- 4) ADD RLS FOR INTERNAL USERS ON SIDEKICK_EVIDENCE_ITEMS
-- ============================================================================

-- Allow internal users to select all evidence for their organisations
CREATE POLICY "Internal users can view all evidence"
ON sidekick_evidence_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM sidekick_projects sp
    JOIN organisation_users ou ON ou.org_id = sp.company_id
    WHERE sp.id = sidekick_evidence_items.project_id
      AND ou.user_id = auth.uid()
  )
);

-- Allow internal users to insert evidence (including internal-only)
CREATE POLICY "Internal users can create evidence"
ON sidekick_evidence_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM sidekick_projects sp
    JOIN organisation_users ou ON ou.org_id = sp.company_id
    WHERE sp.id = sidekick_evidence_items.project_id
      AND ou.user_id = auth.uid()
  )
);

-- Allow internal users to update evidence they created
CREATE POLICY "Internal users can update their evidence"
ON sidekick_evidence_items FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- Allow internal users to delete evidence they created
CREATE POLICY "Internal users can delete their evidence"
ON sidekick_evidence_items FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);