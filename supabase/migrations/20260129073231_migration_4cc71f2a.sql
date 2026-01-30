-- ============================================================================
-- 1) EXTEND PROFILES WITH INTERNAL ROLES
-- ============================================================================

-- Add internal_role column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS internal_role text NULL 
CHECK (internal_role IN ('bd', 'technical', 'commercial', 'ops', 'director', 'admin'));

COMMENT ON COLUMN profiles.internal_role IS 'Internal RD staff role. NULL means client user. Values: bd, technical, commercial, ops, director, admin';