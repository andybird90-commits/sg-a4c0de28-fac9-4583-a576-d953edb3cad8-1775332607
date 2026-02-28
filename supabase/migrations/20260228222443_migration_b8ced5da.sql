ALTER TABLE public.sidekick_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "server_can_view_all_sidekick_projects"
ON public.sidekick_projects
FOR SELECT
TO anon
USING (true);