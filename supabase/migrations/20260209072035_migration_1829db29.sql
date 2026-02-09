-- Add RLS policies for feasibility_availability (Corrected)
ALTER TABLE feasibility_availability ENABLE ROW LEVEL SECURITY;

-- Feasibility users can create own availability
CREATE POLICY "Feasibility users can create own availability"
  ON feasibility_availability FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('feasibility', 'admin', 'hybrid') OR internal_role IN ('technical', 'admin'))
  ));

-- Feasibility users can update own availability
CREATE POLICY "Feasibility users can update own availability"
  ON feasibility_availability FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('feasibility', 'admin', 'hybrid') OR internal_role IN ('technical', 'admin'))
  ));

-- Feasibility users can delete own availability
CREATE POLICY "Feasibility users can delete own availability"
  ON feasibility_availability FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND (role IN ('feasibility', 'admin', 'hybrid') OR internal_role IN ('technical', 'admin'))
  ));

-- Internal users can view availability
CREATE POLICY "Internal users can view availability"
  ON feasibility_availability FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role IS NOT NULL
  ));

-- Admins can manage all availability
CREATE POLICY "Admins can manage all availability"
  ON feasibility_availability FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND internal_role = 'admin'
  ));