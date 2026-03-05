ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS scheme_type text NULL,
ADD COLUMN IF NOT EXISTS scheme text NULL;