-- Create organisations table
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organisation_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on organisations
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Create organisation_users mapping table
CREATE TABLE IF NOT EXISTS public.organisation_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Enable RLS on organisation_users
ALTER TABLE public.organisation_users ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  claim_year INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organisation_users_user_id ON public.organisation_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_users_org_id ON public.organisation_users(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);