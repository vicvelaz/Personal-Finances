-- Custom SQL migration file, put your code below! --
-- Cron-only: posts every due auto_post schedule (catching up missed runs) using each user's local date.
CREATE OR REPLACE FUNCTION public.post_due_scheduled(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  posted integer := 0;
  n integer;
BEGIN
  FOR r IN
    SELECT s.id, (p_now AT TIME ZONE p.timezone)::date AS today
    FROM public.scheduled_transactions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.auto_post AND s.is_active
      AND s.next_run_on <= (p_now AT TIME ZONE p.timezone)::date
  LOOP
    -- One failing schedule (e.g. archived account) must not block the rest.
    BEGIN
      n := 0;
      WHILE n < 400 AND EXISTS (
        SELECT 1 FROM public.scheduled_transactions
        WHERE id = r.id AND is_active AND next_run_on <= r.today
      ) LOOP
        PERFORM public.post_scheduled(r.id);
        n := n + 1;
      END LOOP;
      posted := posted + n;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'post_due_scheduled % failed: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN posted;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.post_due_scheduled(timestamptz) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;--> statement-breakpoint
-- Hourly so each timezone is processed soon after its local midnight.
SELECT cron.schedule('post-due-scheduled', '15 * * * *', 'SELECT public.post_due_scheduled()');