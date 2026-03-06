CREATE TABLE IF NOT EXISTS public.hmrc_inspector_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('standard', 'strict', 'aggressive')),
  status text NOT NULL CHECK (status IN ('active', 'completed')),
  overall_score integer,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hmrc_inspector_sessions
  ADD CONSTRAINT hmrc_inspector_sessions_claim_id_fkey
  FOREIGN KEY (claim_id) REFERENCES public.claims (id) ON DELETE CASCADE;

ALTER TABLE public.hmrc_inspector_sessions
  ADD CONSTRAINT hmrc_inspector_sessions_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_sessions_claim_id
  ON public.hmrc_inspector_sessions (claim_id);

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_sessions_status
  ON public.hmrc_inspector_sessions (status);

CREATE TABLE IF NOT EXISTS public.hmrc_inspector_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('inspector', 'user', 'advisor', 'system')),
  message_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hmrc_inspector_messages
  ADD CONSTRAINT hmrc_inspector_messages_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.hmrc_inspector_sessions (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_messages_session_id_created_at
  ON public.hmrc_inspector_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS public.hmrc_inspector_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  project_id uuid,
  category text NOT NULL CHECK (category IN (
    'advance',
    'baseline',
    'uncertainty',
    'systematic_investigation',
    'evidence',
    'costs',
    'timeline',
    'narrative_alignment'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title text NOT NULL,
  description text NOT NULL,
  recommendation text NOT NULL,
  source_refs_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hmrc_inspector_findings
  ADD CONSTRAINT hmrc_inspector_findings_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.hmrc_inspector_sessions (id) ON DELETE CASCADE;

ALTER TABLE public.hmrc_inspector_findings
  ADD CONSTRAINT hmrc_inspector_findings_claim_id_fkey
  FOREIGN KEY (claim_id) REFERENCES public.claims (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_findings_claim_id
  ON public.hmrc_inspector_findings (claim_id);

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_findings_session_id
  ON public.hmrc_inspector_findings (session_id);

CREATE INDEX IF NOT EXISTS idx_hmrc_inspector_findings_severity
  ON public.hmrc_inspector_findings (severity);

-- Enable RLS
ALTER TABLE public.hmrc_inspector_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmrc_inspector_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmrc_inspector_findings ENABLE ROW LEVEL SECURITY;

-- Staff-only style: allow any authenticated user; UI will restrict to staff roles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hmrc_inspector_sessions'
      AND policyname = 'Authenticated can manage hmrc_inspector_sessions'
  ) THEN
    CREATE POLICY "Authenticated can manage hmrc_inspector_sessions"
      ON public.hmrc_inspector_sessions
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hmrc_inspector_messages'
      AND policyname = 'Authenticated can manage hmrc_inspector_messages'
  ) THEN
    CREATE POLICY "Authenticated can manage hmrc_inspector_messages"
      ON public.hmrc_inspector_messages
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hmrc_inspector_findings'
      AND policyname = 'Authenticated can manage hmrc_inspector_findings'
  ) THEN
    CREATE POLICY "Authenticated can manage hmrc_inspector_findings"
      ON public.hmrc_inspector_findings
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;