-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION public.validate_goal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  acc record;
BEGIN
  IF NEW.target_amount IS NULL OR NEW.target_amount <= 0 THEN
    RAISE EXCEPTION 'goal_invalid_target' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.current_amount < 0 THEN
    RAISE EXCEPTION 'goal_negative_amount' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.account_id IS NOT NULL THEN
    SELECT user_id, currency INTO acc FROM public.accounts WHERE id = NEW.account_id;
    IF NOT FOUND OR acc.user_id <> NEW.user_id OR acc.currency <> NEW.currency THEN
      RAISE EXCEPTION 'goal_invalid_account' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.status <> 'archived' THEN
    NEW.status := CASE WHEN NEW.current_amount >= NEW.target_amount THEN 'achieved' ELSE 'active' END;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS goals_validate ON public.savings_goals;--> statement-breakpoint
CREATE TRIGGER goals_validate
  BEFORE INSERT OR UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_goal();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.adjust_goal(p_id uuid, p_delta bigint)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  result bigint;
BEGIN
  UPDATE public.savings_goals
  SET current_amount = current_amount + p_delta, updated_at = now()
  WHERE id = p_id
  RETURNING current_amount INTO result;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0001';
  END IF;
  RETURN result;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.adjust_goal(uuid, bigint) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.adjust_goal(uuid, bigint) TO authenticated;