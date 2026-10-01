-- Custom SQL migration file, put your code below! --
DROP FUNCTION public.adjust_goal(uuid, bigint);--> statement-breakpoint
-- With p_account, money moves between that account and the goal's account in the same transaction as the adjustment.
CREATE FUNCTION public.adjust_goal(p_id uuid, p_delta bigint, p_account uuid DEFAULT NULL, p_on date DEFAULT current_date)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  goal public.savings_goals;
  g uuid;
  result bigint;
BEGIN
  SELECT * INTO goal FROM public.savings_goals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF p_account IS NOT NULL THEN
    IF goal.account_id IS NULL THEN
      RAISE EXCEPTION 'goal_no_account' USING ERRCODE = 'P0001';
    END IF;
    IF p_delta > 0 THEN
      g := public.create_transfer(p_account, goal.account_id, p_delta, p_on, 'Aportación a ' || goal.name);
    ELSE
      g := public.create_transfer(goal.account_id, p_account, -p_delta, p_on, 'Retirada de ' || goal.name);
    END IF;
    UPDATE public.transactions SET goal_id = goal.id WHERE transfer_group_id = g;
  END IF;
  UPDATE public.savings_goals
  SET current_amount = current_amount + p_delta, updated_at = now()
  WHERE id = p_id
  RETURNING current_amount INTO result;
  RETURN result;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.adjust_goal(uuid, bigint, uuid, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.adjust_goal(uuid, bigint, uuid, date) TO authenticated;