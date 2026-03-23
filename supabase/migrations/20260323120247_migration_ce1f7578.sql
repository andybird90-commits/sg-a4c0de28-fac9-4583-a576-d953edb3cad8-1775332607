DROP TRIGGER IF EXISTS sync_apportionment_line_trigger ON public.claim_apportionment_lines;
DROP FUNCTION IF EXISTS public.sync_apportionment_lines_to_working();