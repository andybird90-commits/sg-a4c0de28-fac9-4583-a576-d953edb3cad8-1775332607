-- Add RLS policies for feasibility_meetings (Corrected)
ALTER TABLE feasibility_meetings ENABLE ROW LEVEL SECURITY;

-- BDM users can create meetings
CREATE POLICY "BDM users can create meetings"
  ON feasibility_meetings FOR INSERT
  TO authenticated
  WITH CHECK (bdm_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
  ));

-- Feasibility users can view their meetings
CREATE POLICY "Feasibility users can view their meetings"
  ON feasibility_meetings FOR SELECT
  TO authenticated
  USING (feasibility_user_id = auth.uid() OR bdm_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
  ));

-- Feasibility users can update their meetings (outcome, status)
CREATE POLICY "Feasibility users can update their meetings"
  ON feasibility_meetings FOR UPDATE
  TO authenticated
  USING (feasibility_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role = 'admin'
  ));

-- Internal users can view all meetings
CREATE POLICY "Internal users can view all meetings"
  ON feasibility_meetings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
  ));

-- Admins can manage all meetings
CREATE POLICY "Admins can manage all meetings"
  ON feasibility_meetings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role = 'admin'
  ));