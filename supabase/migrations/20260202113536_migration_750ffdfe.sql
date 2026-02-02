-- Phase 1: Database Foundation
-- Step 1: Add workflow status columns to claim_projects
ALTER TABLE claim_projects
ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'draft' CHECK (
  workflow_status IN (
    'draft',
    'submitted_to_team', 
    'team_in_progress',
    'awaiting_client_review',
    'revision_requested',
    'approved',
    'cancelled'
  )
),
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS submitted_to_team_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS team_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_to_client_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_feedback TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS approval_status JSONB DEFAULT '{"basic_info":"pending","technical_understanding":"pending","challenges":"pending","qualifying_activities":"pending"}'::jsonb;