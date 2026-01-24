-- Enable RLS on key tables (good practice to ensure it's on)
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 1. Policy for organisation_users: Users can view their own rows
CREATE POLICY "Users can view own memberships" 
ON organisation_users FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Policy for organisations: Users can view organisations they belong to
CREATE POLICY "Users can view their organisations" 
ON organisations FOR SELECT 
USING (
  id IN (
    SELECT org_id 
    FROM organisation_users 
    WHERE user_id = auth.uid()
  )
);

-- 3. Policy for projects: Users can view projects for their organisations
CREATE POLICY "Users can view projects" 
ON projects FOR SELECT 
USING (
  org_id IN (
    SELECT org_id 
    FROM organisation_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Policy for profiles: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- 5. Policy for evidence: Users can view evidence for their organisations
-- (Checking if evidence table exists and needs policy)