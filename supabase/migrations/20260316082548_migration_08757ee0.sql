-- Recreate CRM schema using only valid Postgres constructs (no ADD CONSTRAINT IF NOT EXISTS)

-- 1) CLIENT DOSSIERS
CREATE TABLE IF NOT EXISTS public.client_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','stale','archived')),
  generated_at timestamptz NULL,
  refreshed_at timestamptz NULL,
  business_summary text NULL,
  technical_environment text NULL,
  innovation_signals_json jsonb NULL,
  rd_fit_summary text NULL,
  claim_likelihood text NULL CHECK (claim_likelihood IN ('low','medium','high')),
  potential_claim_size_band text NULL CHECK (potential_claim_size_band IN ('0-25k','25k-50k','50k-100k','100k-250k','250k+')),
  likely_qualifying_themes_json jsonb NULL,
  likely_buyer_personas_json jsonb NULL,
  likely_pain_points_json jsonb NULL,
  likely_objections_json jsonb NULL,
  recommended_approach text NULL,
  key_questions_json jsonb NULL,
  documents_to_request_json jsonb NULL,
  watchouts_json jsonb NULL,
  recommended_next_step text NULL,
  confidence_score numeric(5,2) NULL,
  staff_notes text NULL,
  staff_locked boolean NOT NULL DEFAULT false,
  owner_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_dossiers_client_id
  ON public.client_dossiers(client_id);

CREATE INDEX IF NOT EXISTS idx_client_dossiers_owner
  ON public.client_dossiers(owner_user_id);

ALTER TABLE public.client_dossiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_dossiers'
      AND policyname = 'client_dossiers_internal_all'
  ) THEN
    CREATE POLICY client_dossiers_internal_all
      ON public.client_dossiers
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      );
  END IF;
END$$;

-- 2) CLIENT CONTACTS
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  first_name text NULL,
  last_name text NULL,
  full_name text NULL,
  title text NULL,
  email text NULL,
  phone text NULL,
  mobile text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_decision_maker boolean NOT NULL DEFAULT false,
  preferred_contact_method text NULL CHECK (
    preferred_contact_method IS NULL
    OR preferred_contact_method IN ('email','phone','mobile','teams','in_person')
  ),
  notes text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id
  ON public.client_contacts(client_id);

CREATE INDEX IF NOT EXISTS idx_client_contacts_primary
  ON public.client_contacts(client_id, is_primary)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_client_contacts_active
  ON public.client_contacts(client_id, active)
  WHERE active = true;

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_contacts'
      AND policyname = 'client_contacts_internal_all'
  ) THEN
    CREATE POLICY client_contacts_internal_all
      ON public.client_contacts
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      );
  END IF;
END$$;

-- 3) CLIENT ACTIVITIES
CREATE TABLE IF NOT EXISTS public.client_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  contact_id uuid NULL REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (
    type IN (
      'call','email','meeting','note',
      'system_event','reminder','proposal',
      'cif_event','claim_event'
    )
  ),
  direction text NOT NULL CHECK (
    direction IN ('inbound','outbound','internal','system')
  ),
  subject text NULL,
  summary text NULL,
  body text NULL,
  outcome text NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_date timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_client_activities_client_id_created
  ON public.client_activities(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_activities_follow_up
  ON public.client_activities(client_id, follow_up_required, follow_up_date)
  WHERE follow_up_required = true;

ALTER TABLE public.client_activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_activities'
      AND policyname = 'client_activities_internal_all'
  ) THEN
    CREATE POLICY client_activities_internal_all
      ON public.client_activities
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      );
  END IF;
END$$;

-- 4) CLIENT ACTIVITY LINKS
CREATE TABLE IF NOT EXISTS public.client_activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.client_activities(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('claim','cif','task','dossier')),
  entity_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_activity_links_activity
  ON public.client_activity_links(activity_id);

CREATE INDEX IF NOT EXISTS idx_client_activity_links_entity
  ON public.client_activity_links(entity_type, entity_id);

ALTER TABLE public.client_activity_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_activity_links'
      AND policyname = 'client_activity_links_internal_all'
  ) THEN
    CREATE POLICY client_activity_links_internal_all
      ON public.client_activity_links
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      );
  END IF;
END$$;

-- 5) CLIENT TASKS
CREATE TABLE IF NOT EXISTS public.client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  related_claim_id uuid NULL REFERENCES public.claims(id) ON DELETE SET NULL,
  assigned_to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  task_type text NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_at timestamptz NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','completed','cancelled')),
  completed_at timestamptz NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_tasks_client_id
  ON public.client_tasks(client_id);

CREATE INDEX IF NOT EXISTS idx_client_tasks_assigned_due
  ON public.client_tasks(assigned_to_user_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_client_tasks_related_claim
  ON public.client_tasks(related_claim_id);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_tasks'
      AND policyname = 'client_tasks_internal_all'
  ) THEN
    CREATE POLICY client_tasks_internal_all
      ON public.client_tasks
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.internal_role IS NOT NULL
        )
      );
  END IF;
END$$;