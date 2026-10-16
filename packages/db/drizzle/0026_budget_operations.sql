-- Protect internal reconciliation adjustments from ordinary transaction writes.
CREATE OR REPLACE FUNCTION public.guard_adjustment_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.kind = 'adjustment' THEN
      RAISE EXCEPTION 'adjustment_reconciliation_only' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.kind = 'adjustment' AND (
    TG_OP = 'UPDATE'
    OR current_setting('app.reconcile_account', true) IS DISTINCT FROM 'on'
  ) THEN
    RAISE EXCEPTION 'adjustment_reconciliation_only' USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.kind = 'adjustment' THEN
    RAISE EXCEPTION 'adjustment_reconciliation_only' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER transactions_adjustment_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_adjustment_transaction();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  acc record;
  cat_kind public.category_kind;
BEGIN
  SELECT user_id, currency, is_archived INTO acc FROM public.accounts WHERE id = NEW.account_id;
  IF NOT FOUND OR acc.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'transaction_invalid_account' USING ERRCODE = 'P0001';
  END IF;
  IF acc.is_archived AND (TG_OP = 'INSERT' OR NEW.account_id <> OLD.account_id) THEN
    RAISE EXCEPTION 'transaction_account_archived' USING ERRCODE = 'P0001';
  END IF;
  NEW.currency := acc.currency;

  IF NEW.kind = 'transfer' THEN
    IF NEW.category_id IS NOT NULL THEN
      RAISE EXCEPTION 'transaction_invalid_category' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.transfer_group_id IS NULL OR NEW.amount = 0 THEN
      RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.kind = 'adjustment' THEN
    IF NEW.category_id IS NOT NULL OR NEW.transfer_group_id IS NOT NULL OR NEW.amount = 0 THEN
      RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
    END IF;
  ELSIF (NEW.kind = 'expense' AND NEW.amount >= 0) OR (NEW.kind = 'income' AND NEW.amount <= 0) THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT kind INTO cat_kind FROM public.categories WHERE id = NEW.category_id AND user_id = NEW.user_id;
    IF NOT FOUND OR cat_kind::text <> NEW.kind::text THEN
      RAISE EXCEPTION 'transaction_invalid_category' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.reconcile_account(
  p_account_id uuid,
  p_real_balance bigint,
  p_on date DEFAULT current_date
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  acc public.accounts;
  book_balance bigint;
  delta bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'reconciliation_unauthenticated' USING ERRCODE = 'P0001';
  END IF;
  IF public.has_verified_mfa() AND coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'mfa_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_real_balance IS NULL OR p_on IS NULL THEN
    RAISE EXCEPTION 'reconciliation_invalid_balance' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO acc
  FROM public.accounts
  WHERE id = p_account_id AND user_id = uid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconciliation_invalid_account' USING ERRCODE = 'P0001';
  END IF;
  IF acc.is_archived THEN
    RAISE EXCEPTION 'transaction_account_archived' USING ERRCODE = 'P0001';
  END IF;

  SELECT acc.opening_balance + coalesce(sum(t.amount), 0)::bigint
  INTO book_balance
  FROM public.transactions t
  WHERE t.account_id = acc.id AND t.user_id = uid AND t.occurred_on <= p_on;
  delta := p_real_balance - book_balance;
  IF delta = 0 THEN
    RETURN 0;
  END IF;

  PERFORM pg_catalog.set_config('app.reconcile_account', 'on', true);
  INSERT INTO public.transactions (user_id, account_id, kind, amount, occurred_on)
  VALUES (uid, acc.id, 'adjustment', delta, p_on);
  PERFORM pg_catalog.set_config('app.reconcile_account', 'off', true);
  RETURN delta;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.reconcile_account(uuid, bigint, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reconcile_account(uuid, bigint, date) TO authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_budget()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  current_range daterange;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'budget_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.category_id AND user_id = NEW.user_id AND kind = 'expense'
  ) THEN
    RAISE EXCEPTION 'budget_invalid_category' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.period = 'annual' THEN
    NEW.period_start := date_trunc('year', NEW.period_start)::date;
    IF NEW.period_end IS NOT NULL THEN
      NEW.period_end := (date_trunc('year', NEW.period_end) + interval '1 year' - interval '1 day')::date;
    END IF;
  ELSE
    NEW.period_start := date_trunc('month', NEW.period_start)::date;
    IF NEW.period_end IS NOT NULL THEN
      NEW.period_end := (date_trunc('month', NEW.period_end) + interval '1 month' - interval '1 day')::date;
    END IF;
  END IF;
  IF NEW.period = 'once' AND NEW.period_end IS NOT NULL THEN
    RAISE EXCEPTION 'budget_invalid_dates' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.period_end IS NOT NULL AND NEW.period_end < NEW.period_start THEN
    RAISE EXCEPTION 'budget_invalid_dates' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text || ':' || NEW.category_id::text, 0)
  );
  current_range := pg_catalog.daterange(
    NEW.period_start,
    CASE
      WHEN NEW.period = 'once' THEN (NEW.period_start + interval '1 month')::date
      ELSE coalesce(NEW.period_end + 1, 'infinity'::date)
    END,
    '[)'
  );
  IF EXISTS (
    SELECT 1
    FROM public.budgets b
    WHERE b.user_id = NEW.user_id
      AND b.category_id = NEW.category_id
      AND b.id <> NEW.id
      AND pg_catalog.daterange(
        b.period_start,
        CASE
          WHEN b.period = 'once' THEN (b.period_start + interval '1 month')::date
          ELSE coalesce(b.period_end + 1, 'infinity'::date)
        END,
        '[)'
      ) && current_range
  ) THEN
    RAISE EXCEPTION 'budget_period_overlap' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_budget_month_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  schedule public.budgets;
BEGIN
  SELECT * INTO schedule FROM public.budgets WHERE id = NEW.budget_id AND user_id = NEW.user_id;
  IF NOT FOUND OR schedule.period <> 'monthly' THEN
    RAISE EXCEPTION 'budget_invalid_plan' USING ERRCODE = 'P0001';
  END IF;
  NEW.period_start := date_trunc('month', NEW.period_start)::date;
  IF NEW.period_start < schedule.period_start
     OR (schedule.period_end IS NOT NULL AND NEW.period_start > date_trunc('month', schedule.period_end)::date) THEN
    RAISE EXCEPTION 'budget_invalid_plan' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'budget_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER budget_month_plans_validate
  BEFORE INSERT OR UPDATE ON public.budget_month_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_month_plan();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.guard_budget_operation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.budget_operation', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'budget_operation_protected' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER budget_closures_operation_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.budget_closures
  FOR EACH ROW EXECUTE FUNCTION public.guard_budget_operation();--> statement-breakpoint
CREATE TRIGGER budget_settlements_operation_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.budget_settlements
  FOR EACH ROW EXECUTE FUNCTION public.guard_budget_operation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.validate_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tx public.transactions;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = NEW.transaction_id;
  IF NOT FOUND OR tx.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF tx.kind = 'adjustment' THEN
    RAISE EXCEPTION 'split_adjustment' USING ERRCODE = 'P0001';
  END IF;
  IF tx.kind = 'transfer' THEN
    RAISE EXCEPTION 'split_transfer' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.amount = 0 OR sign(NEW.amount) <> sign(tx.amount) THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.category_id AND user_id = NEW.user_id AND kind::text = tx.kind::text
  ) THEN
    RAISE EXCEPTION 'transaction_invalid_category' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_transaction_splits(p_transaction_id uuid, p_splits jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tx public.transactions;
  parts bigint;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF tx.kind = 'adjustment' THEN
    RAISE EXCEPTION 'split_adjustment' USING ERRCODE = 'P0001';
  END IF;
  IF tx.kind = 'transfer' THEN
    RAISE EXCEPTION 'split_transfer' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.transaction_splits WHERE transaction_id = tx.id;
  IF coalesce(jsonb_array_length(p_splits), 0) = 0 THEN
    RETURN;
  END IF;
  IF jsonb_array_length(p_splits) < 2 THEN
    RAISE EXCEPTION 'split_too_few' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_splits) e WHERE (e->>'amount')::bigint <= 0) THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.transaction_splits (user_id, transaction_id, category_id, amount, note)
  SELECT tx.user_id, tx.id, nullif(e->>'category_id', '')::uuid,
         sign(tx.amount)::bigint * (e->>'amount')::bigint, nullif(trim(e->>'note'), '')
  FROM jsonb_array_elements(p_splits) e;
  SELECT sum(amount) INTO parts FROM public.transaction_splits WHERE transaction_id = tx.id;
  IF parts <> tx.amount THEN
    RAISE EXCEPTION 'split_sum_mismatch' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.transactions SET category_id = NULL, updated_at = now() WHERE id = tx.id;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.apply_budget_settlement(
  p_budget_id uuid,
  p_period_start date,
  p_destination public.budget_settlement_destination,
  p_amount bigint,
  p_idempotency_key text,
  p_target_budget_id uuid DEFAULT NULL,
  p_savings_goal_id uuid DEFAULT NULL,
  p_target_period date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  profile_currency text;
  idempotency_key text;
  source public.budgets;
  target public.budgets;
  goal public.savings_goals;
  period date;
  target_period date;
  source_limit bigint;
  source_spent bigint;
  source_remaining bigint;
  already_settled bigint;
  target_limit bigint;
  target_spent bigint;
  target_funded bigint;
  target_deficit bigint;
  closure uuid;
  settlement uuid;
  closure_status public.budget_closure_status;
  previous record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'budget_unauthenticated' USING ERRCODE = 'P0001';
  END IF;
  IF public.has_verified_mfa() AND coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'mfa_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_period_start IS NULL OR p_destination IS NULL OR p_amount IS NULL OR p_amount <= 0
     OR nullif(pg_catalog.btrim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'budget_invalid_settlement' USING ERRCODE = 'P0001';
  END IF;
  period := date_trunc('month', p_period_start)::date;
  target_period := CASE WHEN p_target_period IS NULL THEN NULL ELSE date_trunc('month', p_target_period)::date END;
  idempotency_key := pg_catalog.btrim(p_idempotency_key);

  SELECT * INTO source
  FROM public.budgets
  WHERE id = p_budget_id AND user_id = uid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF source.period <> 'monthly' OR period < source.period_start
     OR (source.period_end IS NOT NULL AND period > date_trunc('month', source.period_end)::date)
     OR period >= date_trunc('month', current_date)::date THEN
    RAISE EXCEPTION 'budget_closure_monthly_only' USING ERRCODE = 'P0001';
  END IF;
  SELECT base_currency INTO profile_currency FROM public.profiles WHERE id = uid;

  PERFORM pg_catalog.set_config('app.budget_operation', 'on', true);
  INSERT INTO public.budget_closures (user_id, budget_id, period_start)
  VALUES (uid, source.id, period)
  ON CONFLICT (user_id, budget_id, period_start) DO NOTHING;
  SELECT id, status INTO closure, closure_status
  FROM public.budget_closures
  WHERE user_id = uid AND budget_id = source.id AND period_start = period
  FOR UPDATE;

  SELECT s.id, c.budget_id, c.period_start, s.destination, s.target_budget_id,
         s.savings_goal_id, s.target_period, s.amount
  INTO previous
  FROM public.budget_settlements s
  JOIN public.budget_closures c ON c.id = s.closure_id
  WHERE s.user_id = uid AND s.idempotency_key = idempotency_key;
  IF FOUND THEN
    IF previous.budget_id <> source.id OR previous.period_start <> period
       OR previous.destination <> p_destination
       OR previous.target_budget_id IS DISTINCT FROM p_target_budget_id
       OR previous.savings_goal_id IS DISTINCT FROM p_savings_goal_id
       OR previous.target_period IS DISTINCT FROM target_period
       OR previous.amount <> p_amount THEN
      RAISE EXCEPTION 'budget_idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;
    PERFORM pg_catalog.set_config('app.budget_operation', 'off', true);
    RETURN previous.id;
  END IF;

  IF closure_status = 'completed' THEN
    RAISE EXCEPTION 'budget_closure_completed' USING ERRCODE = 'P0001';
  END IF;
  SELECT coalesce(mp.amount, source.amount) INTO source_limit
  FROM (SELECT 1) seed
  LEFT JOIN public.budget_month_plans mp
    ON mp.budget_id = source.id AND mp.period_start = period;
  SELECT coalesce(-sum(l.amount), 0)::bigint INTO source_spent
  FROM public.transaction_lines l
  JOIN public.categories c ON c.id = l.category_id
  WHERE l.user_id = uid AND l.kind = 'expense' AND l.currency = profile_currency
    AND l.occurred_on >= period AND l.occurred_on < (period + interval '1 month')
    AND (c.id = source.category_id OR c.parent_id = source.category_id);
  source_remaining := source_limit - source_spent;
  SELECT coalesce(sum(amount), 0)::bigint INTO already_settled
  FROM public.budget_settlements WHERE closure_id = closure;
  IF source_remaining <= already_settled OR p_amount > source_remaining - already_settled THEN
    RAISE EXCEPTION 'budget_settlement_exceeds_remainder' USING ERRCODE = 'P0001';
  END IF;

  IF p_destination = 'reallocation' THEN
    IF p_target_budget_id IS NULL OR p_savings_goal_id IS NOT NULL OR target_period IS DISTINCT FROM period THEN
      RAISE EXCEPTION 'budget_invalid_destination' USING ERRCODE = 'P0001';
    END IF;
    SELECT * INTO target FROM public.budgets WHERE id = p_target_budget_id AND user_id = uid FOR UPDATE;
    IF NOT FOUND OR target.id = source.id OR target.period = 'annual'
       OR period < target.period_start
       OR (target.period = 'once' AND period <> target.period_start)
       OR (target.period_end IS NOT NULL AND period > date_trunc('month', target.period_end)::date) THEN
      RAISE EXCEPTION 'budget_invalid_target' USING ERRCODE = 'P0001';
    END IF;
    SELECT coalesce(mp.amount, target.amount) INTO target_limit
    FROM (SELECT 1) seed
    LEFT JOIN public.budget_month_plans mp
      ON mp.budget_id = target.id AND mp.period_start = period;
    SELECT coalesce(-sum(l.amount), 0)::bigint INTO target_spent
    FROM public.transaction_lines l
    JOIN public.categories c ON c.id = l.category_id
    WHERE l.user_id = uid AND l.kind = 'expense' AND l.currency = profile_currency
      AND l.occurred_on >= period AND l.occurred_on < (period + interval '1 month')
      AND (c.id = target.category_id OR c.parent_id = target.category_id);
    SELECT coalesce(sum(s.amount), 0)::bigint INTO target_funded
    FROM public.budget_settlements s
    JOIN public.budget_closures c ON c.id = s.closure_id
    WHERE s.user_id = uid AND s.target_budget_id = target.id AND s.target_period = period
      AND s.destination IN ('reallocation', 'rollover');
    target_deficit := greatest(target_spent - target_limit - target_funded, 0);
    IF p_amount > target_deficit THEN
      RAISE EXCEPTION 'budget_reallocation_exceeds_deficit' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_destination = 'goal' THEN
    IF p_target_budget_id IS NOT NULL OR p_savings_goal_id IS NULL OR target_period IS NOT NULL THEN
      RAISE EXCEPTION 'budget_invalid_destination' USING ERRCODE = 'P0001';
    END IF;
    SELECT * INTO goal
    FROM public.savings_goals
    WHERE id = p_savings_goal_id AND user_id = uid
    FOR UPDATE;
    IF NOT FOUND OR goal.status <> 'active' OR goal.currency <> profile_currency THEN
      RAISE EXCEPTION 'budget_invalid_goal' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_destination = 'rollover' THEN
    IF p_target_budget_id IS DISTINCT FROM source.id OR p_savings_goal_id IS NOT NULL
       OR target_period IS DISTINCT FROM (period + interval '1 month')::date THEN
      RAISE EXCEPTION 'budget_invalid_destination' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_destination = 'expire' THEN
    IF p_target_budget_id IS NOT NULL OR p_savings_goal_id IS NOT NULL OR target_period IS NOT NULL THEN
      RAISE EXCEPTION 'budget_invalid_destination' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.budget_settlements
    (user_id, closure_id, destination, target_budget_id, savings_goal_id, target_period, amount, idempotency_key)
  VALUES
    (uid, closure, p_destination, p_target_budget_id, p_savings_goal_id, target_period, p_amount, idempotency_key)
  RETURNING id INTO settlement;

  IF p_destination = 'goal' THEN
    UPDATE public.savings_goals
    SET current_amount = current_amount + p_amount, updated_at = now()
    WHERE id = goal.id;
  END IF;

  IF already_settled + p_amount >= source_remaining THEN
    UPDATE public.budget_closures
    SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = closure;
  END IF;
  PERFORM pg_catalog.set_config('app.budget_operation', 'off', true);
  RETURN settlement;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.apply_budget_settlement(uuid, date, public.budget_settlement_destination, bigint, text, uuid, uuid, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.apply_budget_settlement(uuid, date, public.budget_settlement_destination, bigint, text, uuid, uuid, date) TO authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.complete_budget_closure(p_budget_id uuid, p_period_start date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  source public.budgets;
  period date;
  profile_currency text;
  source_limit bigint;
  source_spent bigint;
  source_remaining bigint;
  already_settled bigint;
  closure uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'budget_unauthenticated' USING ERRCODE = 'P0001';
  END IF;
  IF public.has_verified_mfa() AND coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'mfa_required' USING ERRCODE = 'P0001';
  END IF;
  IF p_period_start IS NULL THEN
    RAISE EXCEPTION 'budget_invalid_period' USING ERRCODE = 'P0001';
  END IF;
  period := date_trunc('month', p_period_start)::date;

  SELECT * INTO source
  FROM public.budgets
  WHERE id = p_budget_id AND user_id = uid
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF source.period <> 'monthly' OR period < source.period_start
     OR (source.period_end IS NOT NULL AND period > date_trunc('month', source.period_end)::date)
     OR period >= date_trunc('month', current_date)::date THEN
    RAISE EXCEPTION 'budget_closure_monthly_only' USING ERRCODE = 'P0001';
  END IF;
  SELECT base_currency INTO profile_currency FROM public.profiles WHERE id = uid;
  PERFORM pg_catalog.set_config('app.budget_operation', 'on', true);
  INSERT INTO public.budget_closures (user_id, budget_id, period_start)
  VALUES (uid, source.id, period)
  ON CONFLICT (user_id, budget_id, period_start) DO NOTHING;
  SELECT id INTO closure
  FROM public.budget_closures
  WHERE user_id = uid AND budget_id = source.id AND period_start = period
  FOR UPDATE;

  SELECT coalesce(mp.amount, source.amount) INTO source_limit
  FROM (SELECT 1) seed
  LEFT JOIN public.budget_month_plans mp
    ON mp.budget_id = source.id AND mp.period_start = period;
  SELECT coalesce(-sum(l.amount), 0)::bigint INTO source_spent
  FROM public.transaction_lines l
  JOIN public.categories c ON c.id = l.category_id
  WHERE l.user_id = uid AND l.kind = 'expense' AND l.currency = profile_currency
    AND l.occurred_on >= period AND l.occurred_on < (period + interval '1 month')
    AND (c.id = source.category_id OR c.parent_id = source.category_id);
  source_remaining := source_limit - source_spent;
  SELECT coalesce(sum(amount), 0)::bigint INTO already_settled
  FROM public.budget_settlements WHERE closure_id = closure;
  IF already_settled < greatest(source_remaining, 0) THEN
    RAISE EXCEPTION 'budget_closure_remainder_pending' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.budget_closures
  SET status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  WHERE id = closure;
  PERFORM pg_catalog.set_config('app.budget_operation', 'off', true);
  RETURN closure;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.complete_budget_closure(uuid, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.complete_budget_closure(uuid, date) TO authenticated;
