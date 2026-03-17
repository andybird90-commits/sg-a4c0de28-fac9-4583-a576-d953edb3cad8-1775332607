CREATE POLICY "sdr_prospects_select_all_authenticated"
ON public.sdr_prospects
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);