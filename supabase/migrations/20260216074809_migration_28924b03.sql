ALTER TABLE cif_records
ADD COLUMN IF NOT EXISTS can_answer_feasibility text CHECK (can_answer_feasibility IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS alternate_contact_informed text CHECK (alternate_contact_informed IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS understands_scheme text CHECK (understands_scheme IN ('yes', 'no', 'dont_know')),
ADD COLUMN IF NOT EXISTS scheme_understanding_details text,
ADD COLUMN IF NOT EXISTS previous_claim_details text,
ADD COLUMN IF NOT EXISTS projects_discussed text CHECK (projects_discussed IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS projects_details text,
ADD COLUMN IF NOT EXISTS fee_terms_discussed text CHECK (fee_terms_discussed IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS fee_terms_details text,
ADD COLUMN IF NOT EXISTS additional_info text;