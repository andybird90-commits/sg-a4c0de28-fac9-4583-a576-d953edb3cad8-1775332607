ALTER TABLE claims
ADD COLUMN IF NOT EXISTS hmrc_submission_pdf_path text,
ADD COLUMN IF NOT EXISTS hmrc_response_pdf_paths text[];