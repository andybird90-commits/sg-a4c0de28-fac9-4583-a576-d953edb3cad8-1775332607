-- Add role and feasibility fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('bdm', 'feasibility', 'admin', 'finance', 'hybrid')),
ADD COLUMN IF NOT EXISTS is_feasibility_available boolean DEFAULT false;

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_feasibility_available ON profiles(is_feasibility_available) WHERE is_feasibility_available = true;

COMMENT ON COLUMN profiles.role IS 'User role: bdm, feasibility, admin, finance, hybrid';
COMMENT ON COLUMN profiles.is_feasibility_available IS 'Whether user is available for feasibility calls';