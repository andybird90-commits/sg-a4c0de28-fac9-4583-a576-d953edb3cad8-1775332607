-- Create CIF state change history table for full audit trail
CREATE TABLE IF NOT EXISTS cif_state_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cif_id uuid NOT NULL REFERENCES cif_records(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  change_type text NOT NULL CHECK (change_type IN ('progress', 'rejection', 'approval')),
  comments text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE cif_state_changes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (internal users only)
CREATE POLICY "Internal users can view state changes"
  ON cif_state_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can create state changes"
  ON cif_state_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cif_state_changes_cif_id ON cif_state_changes(cif_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cif_state_changes_changed_by ON cif_state_changes(changed_by);

COMMENT ON TABLE cif_state_changes IS 'Audit trail of all CIF state transitions (progress, rejections, approvals)';
COMMENT ON COLUMN cif_state_changes.change_type IS 'Type of change: progress (moved forward), rejection (sent back), approval (approved)';