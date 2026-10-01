-- Custom SQL migration file, put your code below! --
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
CREATE TRIGGER transaction_splits_validate
  BEFORE INSERT OR UPDATE ON public.transaction_splits
  FOR EACH ROW EXECUTE FUNCTION public.validate_split();--> statement-breakpoint
-- Deferred so splits can be replaced inside one transaction; checked again at commit.
CREATE OR REPLACE FUNCTION public.check_split_sum()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  tx_id uuid := CASE WHEN TG_TABLE_NAME = 'transactions' THEN NEW.id
                     ELSE coalesce(NEW.transaction_id, OLD.transaction_id) END;
  parent bigint;
  parts bigint;
BEGIN
  SELECT amount INTO parent FROM public.transactions WHERE id = tx_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT sum(amount) INTO parts FROM public.transaction_splits WHERE transaction_id = tx_id;
  IF parts IS NOT NULL AND parts <> parent THEN
    RAISE EXCEPTION 'split_sum_mismatch' USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER transaction_splits_sum
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_splits
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_split_sum();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER transactions_split_sum
  AFTER UPDATE OF amount, kind ON public.transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_split_sum();--> statement-breakpoint
-- Replaces the splits of a transaction. p_splits: [{category_id, amount (positive minor units), note}]; [] removes them.
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
REVOKE EXECUTE ON FUNCTION public.set_transaction_splits(uuid, jsonb) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_transaction_splits(uuid, jsonb) TO authenticated;--> statement-breakpoint
REVOKE ALL ON public.transaction_lines FROM anon;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.budget_progress(p_month date)
RETURNS TABLE (
  budget_id uuid,
  category_id uuid,
  category_name text,
  color text,
  parent_id uuid,
  amount bigint,
  spent bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    b.id,
    c.id,
    c.name,
    c.color,
    c.parent_id,
    b.amount,
    coalesce((
      SELECT -sum(l.amount)
      FROM public.transaction_lines l
      JOIN public.categories tc ON tc.id = l.category_id
      WHERE l.kind = 'expense'
        AND l.currency = p.base_currency
        AND l.occurred_on >= b.period_start
        AND l.occurred_on < (b.period_start + interval '1 month')
        AND (tc.id = c.id OR tc.parent_id = c.id)
    ), 0)::bigint
  FROM public.budgets b
  JOIN public.categories c ON c.id = b.category_id
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.period_start = date_trunc('month', p_month)::date
  ORDER BY c.name;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.expenses_by_category(p_from date, p_to date)
RETURNS TABLE (category_id uuid, name text, color text, total bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    top.id,
    top.name,
    top.color,
    (-sum(l.amount))::bigint AS total
  FROM public.transaction_lines l
  LEFT JOIN public.categories c ON c.id = l.category_id
  LEFT JOIN public.categories top ON top.id = coalesce(c.parent_id, c.id)
  WHERE l.kind = 'expense'
    AND l.occurred_on BETWEEN p_from AND p_to
    AND l.currency = (SELECT base_currency FROM public.profiles WHERE id = auth.uid())
  GROUP BY top.id, top.name, top.color
  ORDER BY total DESC;
$$;