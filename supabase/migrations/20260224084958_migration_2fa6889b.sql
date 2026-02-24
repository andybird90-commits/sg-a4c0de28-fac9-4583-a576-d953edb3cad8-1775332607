DROP POLICY IF EXISTS "Internal users can view pipeline" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal users can create pipeline entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal users can update pipeline entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal users can delete pipeline entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal staff can select pipeline_entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal staff can insert pipeline_entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal staff can update pipeline_entries" ON public.pipeline_entries;
DROP POLICY IF EXISTS "Internal staff can delete pipeline_entries" ON public.pipeline_entries;

CREATE POLICY "Internal staff can select pipeline_entries"
ON public.pipeline_entries
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

CREATE POLICY "Internal staff can insert pipeline_entries"
ON public.pipeline_entries
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

CREATE POLICY "Internal staff can update pipeline_entries"
ON public.pipeline_entries
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

CREATE POLICY "Internal staff can delete pipeline_entries"
ON public.pipeline_entries
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