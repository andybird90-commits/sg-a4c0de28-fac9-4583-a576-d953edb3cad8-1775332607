-- Create evidence_items table
CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  description TEXT,
  tag TEXT,
  location TEXT,
  claim_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evidence_files table
CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;

-- Create policies for evidence_items
CREATE POLICY "Users can view evidence for their organisations" 
ON evidence_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM organisation_users ou 
    WHERE ou.org_id = evidence_items.org_id 
    AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create evidence for their organisations" 
ON evidence_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organisation_users ou 
    WHERE ou.org_id = evidence_items.org_id 
    AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own evidence" 
ON evidence_items FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own evidence" 
ON evidence_items FOR DELETE 
USING (user_id = auth.uid());

-- Create policies for evidence_files
CREATE POLICY "Users can view files for their organisations" 
ON evidence_files FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM evidence_items ei
    JOIN organisation_users ou ON ou.org_id = ei.org_id
    WHERE ei.id = evidence_files.evidence_id 
    AND ou.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files for their evidence" 
ON evidence_files FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evidence_items ei
    WHERE ei.id = evidence_files.evidence_id 
    AND ei.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evidence_items_org_id ON evidence_items(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_project_id ON evidence_items(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_evidence_id ON evidence_files(evidence_id);