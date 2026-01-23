-- Add sidekick_enabled flag to organisations
ALTER TABLE public.organisations 
ADD COLUMN IF NOT EXISTS sidekick_enabled boolean NOT NULL DEFAULT true;

-- Create org_invite_codes table for admin-generated signup codes
CREATE TABLE IF NOT EXISTS public.org_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_org_invite_codes_org_id ON public.org_invite_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invite_codes_code ON public.org_invite_codes(code) WHERE is_active = true;

-- Enable RLS on org_invite_codes
ALTER TABLE public.org_invite_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view/manage invite codes
CREATE POLICY "Org admins can view invite codes" ON public.org_invite_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_users ou
      WHERE ou.org_id = org_invite_codes.org_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
  );

CREATE POLICY "Org admins can create invite codes" ON public.org_invite_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_users ou
      WHERE ou.org_id = org_invite_codes.org_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
  );

CREATE POLICY "Org admins can update invite codes" ON public.org_invite_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_users ou
      WHERE ou.org_id = org_invite_codes.org_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
  );

-- Create rd_claim_evidence table for RD Pro to link Sidekick evidence to claims
CREATE TABLE IF NOT EXISTS public.rd_claim_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  sidekick_evidence_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id),
  type text NOT NULL,
  description text,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  attached_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rd_claim_evidence_claim_id ON public.rd_claim_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_rd_claim_evidence_org_id ON public.rd_claim_evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_rd_claim_evidence_sidekick_id ON public.rd_claim_evidence(sidekick_evidence_id);

-- Enable RLS
ALTER TABLE public.rd_claim_evidence ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can view their claim evidence
CREATE POLICY "Org members can view claim evidence" ON public.rd_claim_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_users ou
      WHERE ou.org_id = rd_claim_evidence.org_id
        AND ou.user_id = auth.uid()
    )
  );

-- Policy: Employees and admins can attach evidence
CREATE POLICY "Employees can attach claim evidence" ON public.rd_claim_evidence
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_users ou
      WHERE ou.org_id = rd_claim_evidence.org_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('admin', 'employee')
    )
  );