-- Allow all authenticated users to view SDR prospects (while keeping existing policies in place)
CREATE POLICY "sdr_prospects_select_all_staff"
ON public.sdr_prospects
FOR SELECT
USING (auth.uid() IS NOT NULL);