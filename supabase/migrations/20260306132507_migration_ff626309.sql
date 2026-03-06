BEGIN;

CREATE TABLE IF NOT EXISTS public.project_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.sidekick_projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  created_by_user_id uuid,
  original_audio_url text,
  transcript_raw text,
  transcript_cleaned text,
  ai_summary text,
  detected_project_name text,
  detection_confidence double precision,
  manually_confirmed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE public.project_voice_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select project voice notes" ON public.project_voice_notes;
DROP POLICY IF EXISTS "Insert project voice notes" ON public.project_voice_notes;
DROP POLICY IF EXISTS "Update own project voice notes" ON public.project_voice_notes;
DROP POLICY IF EXISTS "Delete own project voice notes" ON public.project_voice_notes;

CREATE POLICY "Select project voice notes"
ON public.project_voice_notes
FOR SELECT
USING (true);

CREATE POLICY "Insert project voice notes"
ON public.project_voice_notes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update own project voice notes"
ON public.project_voice_notes
FOR UPDATE
USING (created_by_user_id = auth.uid())
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Delete own project voice notes"
ON public.project_voice_notes
FOR DELETE
USING (created_by_user_id = auth.uid());

COMMIT;