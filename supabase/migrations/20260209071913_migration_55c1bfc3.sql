-- Create feasibility_meetings table
CREATE TABLE IF NOT EXISTS feasibility_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cif_case_id uuid NOT NULL REFERENCES cif_records(id) ON DELETE CASCADE,
  client_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  bdm_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feasibility_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES feasibility_availability(id) ON DELETE SET NULL,
  meeting_date date NOT NULL,
  meeting_start_time timestamptz NOT NULL,
  meeting_end_time timestamptz NOT NULL,
  meeting_status text NOT NULL DEFAULT 'booked' CHECK (meeting_status IN ('booked', 'completed', 'no_show', 'cancelled')),
  outcome text CHECK (outcome IN ('go', 'no_rd', 'undecided')),
  outcome_notes text,
  client_teams_email text,
  teams_meeting_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feasibility_meetings_cif ON feasibility_meetings(cif_case_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_meetings_bdm ON feasibility_meetings(bdm_user_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_meetings_feasibility ON feasibility_meetings(feasibility_user_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_meetings_date ON feasibility_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_feasibility_meetings_status ON feasibility_meetings(meeting_status);

COMMENT ON TABLE feasibility_meetings IS 'Scheduled feasibility call meetings';
COMMENT ON COLUMN feasibility_meetings.meeting_status IS 'Status: booked, completed, no_show, cancelled';
COMMENT ON COLUMN feasibility_meetings.outcome IS 'Result: go (proceed), no_rd (archive), undecided';