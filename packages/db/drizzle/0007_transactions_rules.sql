-- Custom SQL migration file, put your code below! --
-- Keeps transactions consistent with their account and category. SECURITY INVOKER: lookups respect the caller's RLS.
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
DROP TRIGGER IF EXISTS transactions_validate ON public.transactions;--> statement-breakpoint
CREATE TRIGGER transactions_validate
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.assert_transfer(p_from uuid, p_to uuid, p_amount bigint)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  from_currency text;
  to_currency text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'transaction_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF p_from = p_to THEN
    RAISE EXCEPTION 'transfer_same_account' USING ERRCODE = 'P0001';
  END IF;
  SELECT currency INTO from_currency FROM public.accounts WHERE id = p_from;
  SELECT currency INTO to_currency FROM public.accounts WHERE id = p_to;
  IF from_currency IS NULL OR to_currency IS NULL THEN
    RAISE EXCEPTION 'transaction_invalid_account' USING ERRCODE = 'P0001';
  END IF;
  IF from_currency <> to_currency THEN
    RAISE EXCEPTION 'transfer_currency_mismatch' USING ERRCODE = 'P0001';
  END IF;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.create_transfer(
  p_from uuid,
  p_to uuid,
  p_amount bigint,
  p_occurred_on date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  g uuid := gen_random_uuid();
BEGIN
  PERFORM public.assert_transfer(p_from, p_to, p_amount);
  INSERT INTO public.transactions
    (user_id, account_id, kind, amount, occurred_on, description, notes, transfer_group_id)
  VALUES
    (auth.uid(), p_from, 'transfer', -p_amount, p_occurred_on, p_description, p_notes, g),
    (auth.uid(), p_to, 'transfer', p_amount, p_occurred_on, p_description, p_notes, g);
  RETURN g;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.update_transfer(
  p_group uuid,
  p_from uuid,
  p_to uuid,
  p_amount bigint,
  p_occurred_on date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  n int;
BEGIN
  PERFORM public.assert_transfer(p_from, p_to, p_amount);
  -- The negative leg is always the source account.
  UPDATE public.transactions
  SET account_id = CASE WHEN amount < 0 THEN p_from ELSE p_to END,
      amount = CASE WHEN amount < 0 THEN -p_amount ELSE p_amount END,
      occurred_on = p_occurred_on,
      description = p_description,
      notes = p_notes,
      updated_at = now()
  WHERE transfer_group_id = p_group;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION 'transaction_not_found' USING ERRCODE = 'P0001';
  END IF;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.create_transfer(uuid, uuid, bigint, date, text, text) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.update_transfer(uuid, uuid, uuid, bigint, date, text, text) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.assert_transfer(uuid, uuid, bigint) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_transfer(uuid, uuid, bigint, date, text, text) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.update_transfer(uuid, uuid, uuid, bigint, date, text, text) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.assert_transfer(uuid, uuid, bigint) TO authenticated;