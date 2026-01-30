-- ============================================================================
-- 9) CREATE TIMESHEETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  claim_id uuid NULL REFERENCES claims(id) ON DELETE SET NULL,
  sidekick_project_id uuid NULL REFERENCES sidekick_projects(id) ON DELETE SET NULL,
  date date NOT NULL,
  hours numeric(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  activity_type text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE timesheet_entries IS 'Time tracking for internal staff';
COMMENT ON COLUMN timesheet_entries.activity_type IS 'Activity category: bd, technical, cost, ops, etc.';

-- Create index for faster timesheet queries
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_date 
ON timesheet_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_claim 
ON timesheet_entries(claim_id, date DESC);

-- Enable RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users only can write timesheets
CREATE POLICY "Internal users can view timesheets in their orgs"
ON timesheet_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM organisation_users ou
    WHERE ou.org_id = timesheet_entries.org_id
      AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Internal users can create their timesheets"
ON timesheet_entries FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update their timesheets"
ON timesheet_entries FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can delete their timesheets"
ON timesheet_entries FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);