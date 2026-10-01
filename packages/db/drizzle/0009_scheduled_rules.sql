-- Custom SQL migration file, put your code below! --
-- Month-based recurrences are computed from the anchor date so month-end days do not drift.
CREATE OR REPLACE FUNCTION public.next_occurrence(p_start date, p_recurrence public.recurrence, p_current date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  step int;
  months_since int;
BEGIN
  CASE p_recurrence
    WHEN 'none' THEN RETURN NULL;
    WHEN 'daily' THEN RETURN p_current + 1;
    WHEN 'weekly' THEN RETURN p_current + 7;
    WHEN 'biweekly' THEN RETURN p_current + 14;
    WHEN 'monthly' THEN step := 1;
    WHEN 'quarterly' THEN step := 3;
    WHEN 'yearly' THEN step := 12;
  END CASE;
  months_since := (extract(year FROM p_current)::int - extract(year FROM p_start)::int) * 12
                + (extract(month FROM p_current)::int - extract(month FROM p_start)::int);
  RETURN (p_start + make_interval(months => (months_since / step + 1) * step))::date;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.validate_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  acc record;
  cat_kind public.category_kind;
BEGIN
  IF NEW.kind = 'transfer' THEN
    RAISE EXCEPTION 'scheduled_invalid_kind' USING ERRCODE = 'P0001';
  END IF;
  SELECT user_id, currency INTO acc FROM public.accounts WHERE id = NEW.account_id;
  IF NOT FOUND OR acc.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'transaction_invalid_account' USING ERRCODE = 'P0001';
  END IF;
  NEW.currency := acc.currency;
  IF (NEW.kind = 'expense' AND NEW.amount >= 0) OR (NEW.kind = 'income' AND NEW.amount <= 0) THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.category_id IS NOT NULL THEN
    SELECT kind INTO cat_kind FROM public.categories WHERE id = NEW.category_id AND user_id = NEW.user_id;
    IF NOT FOUND OR cat_kind::text <> NEW.kind::text THEN
      RAISE EXCEPTION 'transaction_invalid_category' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.ends_on IS NOT NULL AND NEW.ends_on < NEW.starts_on THEN
    RAISE EXCEPTION 'scheduled_invalid_dates' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' OR NEW.starts_on <> OLD.starts_on OR NEW.recurrence <> OLD.recurrence THEN
    NEW.next_run_on := NEW.starts_on;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS scheduled_validate ON public.scheduled_transactions;--> statement-breakpoint
CREATE TRIGGER scheduled_validate
  BEFORE INSERT OR UPDATE ON public.scheduled_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_scheduled();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.advance_scheduled(s public.scheduled_transactions)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  nxt date := public.next_occurrence(s.starts_on, s.recurrence, s.next_run_on);
BEGIN
  UPDATE public.scheduled_transactions
  SET next_run_on = coalesce(nxt, next_run_on),
      is_active = nxt IS NOT NULL AND (ends_on IS NULL OR nxt <= ends_on),
      updated_at = now()
  WHERE id = s.id;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.post_scheduled(p_id uuid, p_occurred_on date DEFAULT NULL, p_amount bigint DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  s public.scheduled_transactions;
  magnitude bigint;
  tx_id uuid;
BEGIN
  SELECT * INTO s FROM public.scheduled_transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduled_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT s.is_active THEN
    RAISE EXCEPTION 'scheduled_inactive' USING ERRCODE = 'P0001';
  END IF;
  magnitude := coalesce(p_amount, abs(s.amount));
  IF magnitude <= 0 THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.transactions
    (user_id, account_id, category_id, kind, amount, occurred_on, description, scheduled_transaction_id)
  VALUES
    (s.user_id, s.account_id, s.category_id, s.kind,
     CASE WHEN s.kind = 'expense' THEN -magnitude ELSE magnitude END,
     coalesce(p_occurred_on, s.next_run_on), s.description, s.id)
  RETURNING id INTO tx_id;
  PERFORM public.advance_scheduled(s);
  RETURN tx_id;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.skip_scheduled(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  s public.scheduled_transactions;
BEGIN
  SELECT * INTO s FROM public.scheduled_transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scheduled_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF NOT s.is_active THEN
    RAISE EXCEPTION 'scheduled_inactive' USING ERRCODE = 'P0001';
  END IF;
  PERFORM public.advance_scheduled(s);
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.advance_scheduled(public.scheduled_transactions) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.post_scheduled(uuid, date, bigint) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.skip_scheduled(uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.post_scheduled(uuid, date, bigint) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.skip_scheduled(uuid) TO authenticated;