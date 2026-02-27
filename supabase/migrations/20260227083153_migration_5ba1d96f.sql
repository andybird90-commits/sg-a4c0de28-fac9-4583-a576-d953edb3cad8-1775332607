-- 1) Create the sidekick_project_cost_advice table (idempotent on the table itself)
CREATE TABLE IF NOT EXISTS public.sidekick_project_cost_advice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.sidekick_projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  cost_type text NOT NULL CHECK (cost_type IN ('staff','subcontractor','consumables','software','other')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  description text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.sidekick_project_cost_advice ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies

-- Clients can insert their own cost advice rows
CREATE POLICY "sidekick_cost_advice_insert_own"
ON public.sidekick_project_cost_advice
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Clients can select their own cost advice rows
CREATE POLICY "sidekick_cost_advice_select_own"
ON public.sidekick_project_cost_advice
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Internal staff can read cost advice (for any project)
CREATE POLICY "sidekick_cost_advice_select_internal"
ON public.sidekick_project_cost_advice
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

-- Clients can update their own advice
CREATE POLICY "sidekick_cost_advice_update_own"
ON public.sidekick_project_cost_advice
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Clients can delete their own advice
CREATE POLICY "sidekick_cost_advice_delete_own"
ON public.sidekick_project_cost_advice
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sidekick_cost_advice_project
  ON public.sidekick_project_cost_advice(project_id);

CREATE INDEX IF NOT EXISTS idx_sidekick_cost_advice_created_by
  ON public.sidekick_project_cost_advice(created_by);