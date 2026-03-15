CREATE TABLE IF NOT EXISTS claim_completion_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,

  technical_status text NOT NULL DEFAULT 'not_started',
  technical_notes text,
  technical_completed_at timestamptz,
  technical_completed_by uuid REFERENCES profiles(id),

  cost_status text NOT NULL DEFAULT 'not_started',
  cost_notes text,
  cost_completed_at timestamptz,
  cost_completed_by uuid REFERENCES profiles(id),

  qa_status text NOT NULL DEFAULT 'not_started',
  qa_notes text,
  qa_completed_at timestamptz,
  qa_completed_by uuid REFERENCES profiles(id),

  draft_status text NOT NULL DEFAULT 'not_started',
  draft_completed_at timestamptz,
  draft_completed_by uuid REFERENCES profiles(id),
  draft_document_id text,

  final_status text NOT NULL DEFAULT 'not_started',
  final_completed_at timestamptz,
  final_completed_by uuid REFERENCES profiles(id),
  final_document_id text,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT claim_completion_status_claim_id_key UNIQUE (claim_id),
  CONSTRAINT claim_completion_status_technical_status_check
    CHECK (technical_status IN ('not_started','in_progress','complete')),
  CONSTRAINT claim_completion_status_cost_status_check
    CHECK (cost_status IN ('not_started','in_progress','complete')),
  CONSTRAINT claim_completion_status_qa_status_check
    CHECK (qa_status IN ('not_started','in_progress','complete')),
  CONSTRAINT claim_completion_status_draft_status_check
    CHECK (draft_status IN ('not_started','in_progress','complete')),
  CONSTRAINT claim_completion_status_final_status_check
    CHECK (final_status IN ('not_started','in_progress','complete'))
);

ALTER TABLE claim_completion_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claim_completion_status'
      AND policyname = 'claim_completion_status_select'
  ) THEN
    CREATE POLICY claim_completion_status_select
      ON claim_completion_status
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claim_completion_status'
      AND policyname = 'claim_completion_status_insert'
  ) THEN
    CREATE POLICY claim_completion_status_insert
      ON claim_completion_status
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claim_completion_status'
      AND policyname = 'claim_completion_status_update'
  ) THEN
    CREATE POLICY claim_completion_status_update
      ON claim_completion_status
      FOR UPDATE
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;