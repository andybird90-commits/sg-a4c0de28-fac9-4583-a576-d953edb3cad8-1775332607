-- Enable RLS on organisations table if not already enabled
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read organisations (needed for signup validation)
CREATE POLICY "Anyone can view organisations" ON organisations
  FOR SELECT
  USING (true);

-- Only authenticated users can insert organisations (admin only)
CREATE POLICY "Authenticated users can insert organisations" ON organisations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update organisations (admin only)
CREATE POLICY "Authenticated users can update organisations" ON organisations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can delete organisations (admin only)
CREATE POLICY "Authenticated users can delete organisations" ON organisations
  FOR DELETE
  USING (auth.uid() IS NOT NULL);