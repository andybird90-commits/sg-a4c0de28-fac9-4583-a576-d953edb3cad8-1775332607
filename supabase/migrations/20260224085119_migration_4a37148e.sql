CREATE POLICY "Debug allow all pipeline for authenticated"
ON public.pipeline_entries
AS PERMISSIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);