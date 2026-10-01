-- Custom SQL migration file, put your code below! --
-- authenticated cannot read auth.mfa_factors, so this runs as definer and only reports on the caller.
CREATE OR REPLACE FUNCTION public.has_verified_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1 FROM auth.mfa_factors WHERE user_id = auth.uid() AND status = 'verified'
	);
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.has_verified_mfa() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.has_verified_mfa() TO authenticated;--> statement-breakpoint
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
	IF coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' AND public.has_verified_mfa() THEN
		RAISE EXCEPTION 'mfa_required' USING ERRCODE = 'P0001';
	END IF;
	DELETE FROM auth.users WHERE id = uid;
END;
$$;