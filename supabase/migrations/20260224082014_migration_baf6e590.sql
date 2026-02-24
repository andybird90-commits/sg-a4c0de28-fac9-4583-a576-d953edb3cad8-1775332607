DROP POLICY IF EXISTS "Internal users can insert pipeline entries" ON public.pipeline_entries;

CREATE POLICY "Internal staff can insert pipeline entries"
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