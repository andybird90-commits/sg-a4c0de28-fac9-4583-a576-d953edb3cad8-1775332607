-- Create feasibility_availability table for scheduling slots
CREATE TABLE IF NOT EXISTS feasibility_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  slot_length_minutes integer DEFAULT 30 CHECK (slot_length_minutes > 0),
  is_booked boolean DEFAULT false,
  cif_case_id uuid REFERENCES cif_records(id) ON DELETE SET NULL,
  slot_type text DEFAULT 'feasibility_call',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_feasibility_availability_user ON feasibility_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_availability_time ON feasibility_availability(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_feasibility_availability_booked ON feasibility_availability(is_booked) WHERE is_booked = false;
CREATE INDEX IF NOT EXISTS idx_feasibility_availability_cif ON feasibility_availability(cif_case_id);

COMMENT ON TABLE feasibility_availability IS 'Availability slots for feasibility call bookings';
COMMENT ON COLUMN feasibility_availability.user_id IS 'Feasibility user offering this slot';
COMMENT ON COLUMN feasibility_availability.is_booked IS 'Whether slot has been booked';
COMMENT ON COLUMN feasibility_availability.cif_case_id IS 'CIF case linked to this booking';