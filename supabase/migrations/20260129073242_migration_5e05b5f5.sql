-- ============================================================================
-- 2) EXTEND SIDEKICK_PROJECTS FOR CLAIM LIFECYCLE
-- ============================================================================

-- Add claim lifecycle columns to sidekick_projects
ALTER TABLE sidekick_projects
ADD COLUMN IF NOT EXISTS claim_id uuid NULL,
ADD COLUMN IF NOT EXISTS internal_status text NULL,
ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS accepted_at timestamptz NULL;

-- Add check constraint for status values
ALTER TABLE sidekick_projects
DROP CONSTRAINT IF EXISTS sidekick_projects_status_check;

ALTER TABLE sidekick_projects
ADD CONSTRAINT sidekick_projects_status_check 
CHECK (status IN ('draft', 'needs_changes', 'submitted', 'in_review', 'accepted'));

COMMENT ON COLUMN sidekick_projects.claim_id IS 'Link to R&D claim once project is accepted';
COMMENT ON COLUMN sidekick_projects.internal_status IS 'Optional internal state for RD team use';
COMMENT ON COLUMN sidekick_projects.submitted_at IS 'When client submitted project to RD team';
COMMENT ON COLUMN sidekick_projects.accepted_at IS 'When RD team accepted project into claim';