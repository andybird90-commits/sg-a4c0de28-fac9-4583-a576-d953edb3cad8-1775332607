-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_projects_workflow_status ON claim_projects(workflow_status);
CREATE INDEX IF NOT EXISTS idx_claim_projects_assigned_to ON claim_projects(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_claim_projects_due_date ON claim_projects(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claim_projects_org_workflow ON claim_projects(org_id, workflow_status);