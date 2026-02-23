-- 1) Create table
CREATE TABLE IF NOT EXISTS public.clients_to_be_onboarded (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text NOT NULL,
  contact_name text,
  title text,
  email text,
  phone text,
  landline text,
  address text,
  bdm uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_number text,
  utr text,
  fee_percent numeric(5,2),
  year_end_month text,
  ref_by text,
  ref_fee numeric(12,2),
  comments text
);

-- 2) Enable RLS
ALTER TABLE public.clients_to_be_onboarded ENABLE ROW LEVEL SECURITY;

-- 3) Policies for internal staff (internal_role IS NOT NULL)

-- SELECT
CREATE POLICY "Internal staff can select clients_to_be_onboarded"
ON public.clients_to_be_onboarded
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- INSERT
CREATE POLICY "Internal staff can insert clients_to_be_onboarded"
ON public.clients_to_be_onboarded
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- UPDATE
CREATE POLICY "Internal staff can update clients_to_be_onboarded"
ON public.clients_to_be_onboarded
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);

-- DELETE
CREATE POLICY "Internal staff can delete clients_to_be_onboarded"
ON public.clients_to_be_onboarded
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.internal_role IS NOT NULL
  )
);