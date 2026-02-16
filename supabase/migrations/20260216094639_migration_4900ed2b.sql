-- Add new fields from Company Information Form to cif_records
ALTER TABLE cif_records
-- Feasibility Call/Meeting Info
ADD COLUMN IF NOT EXISTS feasibility_call_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS any_issues_gathering_info text CHECK (any_issues_gathering_info IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS issues_gathering_info_details text,

-- Company Financial Details
ADD COLUMN IF NOT EXISTS utr text,
ADD COLUMN IF NOT EXISTS turnover numeric(14,2),
ADD COLUMN IF NOT EXISTS payroll numeric(14,2),
ADD COLUMN IF NOT EXISTS vat_number text,
ADD COLUMN IF NOT EXISTS paye_reference text,

-- Competent Professionals (up to 3)
ADD COLUMN IF NOT EXISTS competent_professional_1_name text,
ADD COLUMN IF NOT EXISTS competent_professional_1_position text,
ADD COLUMN IF NOT EXISTS competent_professional_1_mobile text,
ADD COLUMN IF NOT EXISTS competent_professional_1_email text,

ADD COLUMN IF NOT EXISTS competent_professional_2_name text,
ADD COLUMN IF NOT EXISTS competent_professional_2_position text,
ADD COLUMN IF NOT EXISTS competent_professional_2_mobile text,
ADD COLUMN IF NOT EXISTS competent_professional_2_email text,

ADD COLUMN IF NOT EXISTS competent_professional_3_name text,
ADD COLUMN IF NOT EXISTS competent_professional_3_position text,
ADD COLUMN IF NOT EXISTS competent_professional_3_mobile text,
ADD COLUMN IF NOT EXISTS competent_professional_3_email text,

-- Claim Details
ADD COLUMN IF NOT EXISTS first_claim_year_for_new_claim integer,
ADD COLUMN IF NOT EXISTS accounts_filed text CHECK (accounts_filed IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS ct600_filed_seen text CHECK (ct600_filed_seen IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS pre_notification_required text CHECK (pre_notification_required IN ('yes', 'no')),

-- Project Details
ADD COLUMN IF NOT EXISTS costs_details text,
ADD COLUMN IF NOT EXISTS subcontractors_involved text CHECK (subcontractors_involved IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS time_sensitive text CHECK (time_sensitive IN ('yes', 'no')),

-- Contract Terms
ADD COLUMN IF NOT EXISTS year_end_month text,
ADD COLUMN IF NOT EXISTS apes text,
ADD COLUMN IF NOT EXISTS fee_percentage numeric(5,2),
ADD COLUMN IF NOT EXISTS minimum_fee numeric(12,2),
ADD COLUMN IF NOT EXISTS introducer text CHECK (introducer IN ('yes', 'no')),
ADD COLUMN IF NOT EXISTS introducer_details text;