-- ============================================================================
-- 10) ADD RLS FOR INTERNAL USERS ON FEASIBILITY_ANALYSES
-- ============================================================================

-- Allow internal users to access feasibility analyses
CREATE POLICY "Internal users can view feasibility analyses"
ON feasibility_analyses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create feasibility analyses"
ON feasibility_analyses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update feasibility analyses"
ON feasibility_analyses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);