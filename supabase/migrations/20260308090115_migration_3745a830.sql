-- 1) Create organisation_notification_status table

CREATE TABLE IF NOT EXISTS public.organisation_notification_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  accounting_period_start date,
  accounting_period_end date,
  has_claimed_before boolean,
  claimed_within_last_3_years boolean,
  notification_required boolean,
  status text NOT NULL DEFAULT 'unclear',
  deadline_date date,
  internal_rd_contact_name text,
  internal_rd_contact_email text,
  organisation_rd_summary text,
  submission_reference text,
  submission_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constrain status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organisation_notification_status_status_check'
  ) THEN
    ALTER TABLE public.organisation_notification_status
      ADD CONSTRAINT organisation_notification_status_status_check
      CHECK (status IN ('not_required','required','submitted','overdue','unclear'));
  END IF;
END $$;

-- Useful index
CREATE INDEX IF NOT EXISTS idx_organisation_notification_status_org
  ON public.organisation_notification_status (organisation_id);

-- Enable RLS
ALTER TABLE public.organisation_notification_status ENABLE ROW LEVEL SECURITY;

-- Internal users (staff) can manage statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organisation_notification_status'
      AND policyname = 'Internal users can manage organisation notification status'
  ) THEN
    CREATE POLICY "Internal users can manage organisation notification status"
    ON public.organisation_notification_status
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.internal_role IS NOT NULL
      )
    );
  END IF;
END $$;

-- Org members can view their organisation's status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organisation_notification_status'
      AND policyname = 'Org members can view organisation notification status'
  ) THEN
    CREATE POLICY "Org members can view organisation notification status"
    ON public.organisation_notification_status
    FOR SELECT
    TO authenticated
    USING (
      organisation_id IN (
        SELECT ou.org_id
        FROM public.organisation_users ou
        WHERE ou.user_id = auth.uid()
      )
    );
  END IF;
END $$;