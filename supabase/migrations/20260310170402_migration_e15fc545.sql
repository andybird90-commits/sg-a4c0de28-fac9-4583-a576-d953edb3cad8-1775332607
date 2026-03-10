ALTER TABLE public.cif_records
ADD COLUMN created_by uuid;

ALTER TABLE public.cif_records
ADD CONSTRAINT cif_records_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cif_records_created_by
ON public.cif_records (created_by);