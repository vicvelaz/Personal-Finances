-- Custom SQL migration file, put your code below! --
-- Deletes only the caller's auth user; all app data cascades from profiles.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;