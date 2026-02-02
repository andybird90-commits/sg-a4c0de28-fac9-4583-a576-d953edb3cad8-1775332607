-- Create claim_documents table for document management
CREATE TABLE claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  project_id UUID REFERENCES claim_projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Document details
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'technical_narrative', 'cost_breakdown', 'timesheets', 
    'invoices', 'contracts', 'project_plan', 'meeting_notes',
    'test_results', 'correspondence', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Categorization
  tags TEXT[],
  is_confidential BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'reviewed', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_claim_documents_claim_id ON claim_documents(claim_id);
CREATE INDEX idx_claim_documents_project_id ON claim_documents(project_id);
CREATE INDEX idx_claim_documents_org_id ON claim_documents(org_id);
CREATE INDEX idx_claim_documents_type ON claim_documents(doc_type);
CREATE INDEX idx_claim_documents_status ON claim_documents(status);

-- Enable RLS
ALTER TABLE claim_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Internal users can view claim documents"
  ON claim_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can create claim documents"
  ON claim_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can update claim documents"
  ON claim_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );

CREATE POLICY "Internal users can delete claim documents"
  ON claim_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
    )
  );