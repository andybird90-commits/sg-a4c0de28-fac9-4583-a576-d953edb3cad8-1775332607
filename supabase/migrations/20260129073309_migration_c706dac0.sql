-- ============================================================================
-- 6) CREATE CIF ONBOARDING TABLES
-- ============================================================================

-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL REFERENCES organisations(id) ON DELETE SET NULL,
  company_number text NULL,
  company_name text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'section1_in_progress', 'section2_in_progress',
    'section3_in_progress', 'section4_in_progress',
    'ready_for_cif_approval', 'cif_approved', 'lost'
  )),
  bd_owner_id uuid NOT NULL REFERENCES profiles(id),
  technical_lead_id uuid NULL REFERENCES profiles(id),
  commercial_lead_id uuid NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE prospects IS 'Prospective clients going through CIF onboarding';
COMMENT ON COLUMN prospects.org_id IS 'Linked organisation (created after CIF approval)';
COMMENT ON COLUMN prospects.company_number IS 'Companies House number';

-- Create cif_records table
CREATE TABLE IF NOT EXISTS cif_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  org_id uuid NULL REFERENCES organisations(id) ON DELETE SET NULL,
  section1_completed_by uuid NULL REFERENCES profiles(id),
  section1_completed_at timestamptz NULL,
  section2_feasibility_id uuid NULL REFERENCES feasibility_analyses(id),
  section3_completed_by uuid NULL REFERENCES profiles(id),
  section3_completed_at timestamptz NULL,
  section4_completed_by uuid NULL REFERENCES profiles(id),
  section4_completed_at timestamptz NULL,
  cif_status text NOT NULL DEFAULT 'in_progress' CHECK (cif_status IN (
    'in_progress', 'ready_for_approval', 'approved', 'rejected'
  )),
  director_id uuid NULL REFERENCES profiles(id),
  director_decision text NULL CHECK (director_decision IN ('approved', 'rejected')),
  director_comment text NULL,
  director_decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cif_records IS 'Client Information Form records tracking 4-section onboarding';
COMMENT ON COLUMN cif_records.section2_feasibility_id IS 'Link to feasibility analysis (Section 2)';

-- Create cif_documents table
CREATE TABLE IF NOT EXISTS cif_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cif_id uuid NOT NULL REFERENCES cif_records(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text NULL
);

COMMENT ON TABLE cif_documents IS 'Documents uploaded during CIF process (LoA, anti-slavery, etc.)';
COMMENT ON COLUMN cif_documents.doc_type IS 'Document type: loa, anti_slavery, msa, etc.';
COMMENT ON COLUMN cif_documents.file_path IS 'Supabase storage path';

-- Enable RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cif_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cif_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Internal users only
CREATE POLICY "Internal users can view prospects"
ON prospects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create prospects"
ON prospects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update prospects"
ON prospects FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can view cif_records"
ON cif_records FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create cif_records"
ON cif_records FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can update cif_records"
ON cif_records FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can view cif_documents"
ON cif_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can create cif_documents"
ON cif_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

CREATE POLICY "Internal users can delete cif_documents"
ON cif_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);