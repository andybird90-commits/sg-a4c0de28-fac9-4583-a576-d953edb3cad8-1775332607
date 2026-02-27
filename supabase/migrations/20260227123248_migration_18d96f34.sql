CREATE TABLE IF NOT EXISTS public.calendar_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('m365')),
  azure_oid text NOT NULL,
  refresh_token text NOT NULL,
  access_token text NULL,
  access_token_expires_at timestamptz NULL,
  primary_calendar_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own calendar accounts" ON public.calendar_accounts;

CREATE POLICY "Users manage own calendar accounts"
ON public.calendar_accounts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());