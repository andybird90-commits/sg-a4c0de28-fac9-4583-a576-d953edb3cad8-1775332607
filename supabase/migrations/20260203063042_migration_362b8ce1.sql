-- Fix claims table RLS policies to be staff-only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated SELECT" ON claims;
DROP POLICY IF EXISTS "Allow authenticated INSERT" ON claims;
DROP POLICY IF EXISTS "Allow authenticated UPDATE" ON claims;
DROP POLICY IF EXISTS "Allow authenticated DELETE" ON claims;

-- Create proper staff-only policies
CREATE POLICY "Internal users can view claims" ON claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM organisation_users ou
      WHERE ou.org_id = claims.org_id AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Internal users can create claims" ON claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can update claims" ON claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can delete claims" ON claims
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );