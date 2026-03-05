ALTER TABLE claims
ADD COLUMN IF NOT EXISTS qa_reviewer_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS qa_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS qa_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS client_review_requested_at timestamptz,
ADD COLUMN IF NOT EXISTS client_review_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS submitted_claim_value numeric(14,2),
ADD COLUMN IF NOT EXISTS received_claim_value numeric(14,2),
ADD COLUMN IF NOT EXISTS hmrc_submission_pdf_path text,
ADD COLUMN IF NOT EXISTS hmrc_response_pdf_paths text[];