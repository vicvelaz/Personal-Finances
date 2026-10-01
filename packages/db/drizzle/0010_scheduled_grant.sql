-- Custom SQL migration file, put your code below! --
-- post/skip run as the caller, so the caller needs EXECUTE on the helper; RLS still guards the UPDATE.
GRANT EXECUTE ON FUNCTION public.advance_scheduled(public.scheduled_transactions) TO authenticated;