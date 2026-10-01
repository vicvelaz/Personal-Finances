-- Custom SQL migration file, put your code below! --
-- Rates are stored as 1 EUR = rate quote. Uses the latest rate on or before p_on, else the nearest later one.
CREATE OR REPLACE FUNCTION public.fx_rate(p_from text, p_to text, p_on date)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH eur AS (
    SELECT c, CASE WHEN c = 'EUR' THEN 1::numeric ELSE (
      SELECT r.rate FROM public.exchange_rates r
      WHERE r.base = 'EUR' AND r.quote = c
      ORDER BY (r.rate_date > p_on), abs(r.rate_date - p_on)
      LIMIT 1
    ) END AS r
    FROM unnest(ARRAY[p_from, p_to]) AS c
  )
  SELECT CASE WHEN p_from = p_to THEN 1::numeric
    ELSE (SELECT r FROM eur WHERE c = p_to) / nullif((SELECT r FROM eur WHERE c = p_from), 0)
  END;
$$;--> statement-breakpoint
-- Amounts are minor units (x100) for every currency, so the rate applies directly. NULL when no rate is known.
CREATE OR REPLACE FUNCTION public.convert_amount(p_amount bigint, p_from text, p_to text, p_on date)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT round(p_amount * public.fx_rate(p_from, p_to, p_on))::bigint;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.fx_rate(text, text, date) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.convert_amount(bigint, text, text, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.fx_rate(text, text, date) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.convert_amount(bigint, text, text, date) TO authenticated;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.monthly_totals(p_from date, p_to date)
RETURNS TABLE (month date, income bigint, expense bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH months AS (
    SELECT generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date AS month
  ),
  base AS (
    SELECT base_currency FROM public.profiles WHERE id = auth.uid()
  )
  SELECT
    m.month,
    coalesce(sum(public.convert_amount(t.amount, t.currency, b.base_currency, t.occurred_on)) FILTER (WHERE t.kind = 'income'), 0)::bigint,
    coalesce(-sum(public.convert_amount(t.amount, t.currency, b.base_currency, t.occurred_on)) FILTER (WHERE t.kind = 'expense'), 0)::bigint
  FROM months m
  CROSS JOIN base b
  LEFT JOIN public.transactions t
    ON t.occurred_on >= m.month
   AND t.occurred_on < m.month + interval '1 month'
   AND t.kind IN ('income', 'expense')
  GROUP BY m.month
  ORDER BY m.month;
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
    (-sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on)))::bigint AS total
  FROM public.transaction_lines l
  JOIN public.profiles p ON p.id = auth.uid()
  LEFT JOIN public.categories c ON c.id = l.category_id
  LEFT JOIN public.categories top ON top.id = coalesce(c.parent_id, c.id)
  WHERE l.kind = 'expense'
    AND l.occurred_on BETWEEN p_from AND p_to
  GROUP BY top.id, top.name, top.color
  HAVING sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on)) IS NOT NULL
  ORDER BY total DESC;
$$;--> statement-breakpoint
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
      SELECT -sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on))
      FROM public.transaction_lines l
      JOIN public.categories tc ON tc.id = l.category_id
      WHERE l.kind = 'expense'
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
-- Total balance of all the caller's accounts in the base currency at today's rate.
CREATE OR REPLACE FUNCTION public.net_worth()
RETURNS TABLE (total bigint, currency text, missing text[])
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH base AS (
    SELECT base_currency AS c FROM public.profiles WHERE id = auth.uid()
  ),
  bal AS (
    SELECT a.currency, sum(a.balance)::bigint AS balance FROM public.account_balances a GROUP BY a.currency
  ),
  conv AS (
    SELECT bal.currency, public.convert_amount(bal.balance, bal.currency, base.c, current_date) AS v
    FROM bal CROSS JOIN base
  )
  SELECT
    coalesce((SELECT sum(v) FROM conv), 0)::bigint,
    (SELECT c FROM base),
    coalesce((SELECT array_agg(currency ORDER BY currency) FROM conv WHERE v IS NULL), '{}');
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.net_worth() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.net_worth() TO authenticated;--> statement-breakpoint
DROP FUNCTION public.create_transfer(uuid, uuid, bigint, date, text, text);--> statement-breakpoint
DROP FUNCTION public.update_transfer(uuid, uuid, uuid, bigint, date, text, text);--> statement-breakpoint
DROP FUNCTION public.assert_transfer(uuid, uuid, bigint);--> statement-breakpoint
-- Validates a transfer and returns the amount credited to the destination account.
CREATE OR REPLACE FUNCTION public.resolve_transfer_amount(p_from uuid, p_to uuid, p_amount bigint, p_to_amount bigint)
RETURNS bigint
LANGUAGE plpgsql
STABLE
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
  IF from_currency = to_currency THEN
    RETURN p_amount;
  END IF;
  IF p_to_amount IS NULL OR p_to_amount <= 0 THEN
    RAISE EXCEPTION 'transfer_to_amount_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN p_to_amount;
END;
$$;--> statement-breakpoint
CREATE FUNCTION public.create_transfer(
  p_from uuid,
  p_to uuid,
  p_amount bigint,
  p_occurred_on date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_to_amount bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  g uuid := gen_random_uuid();
  credited bigint := public.resolve_transfer_amount(p_from, p_to, p_amount, p_to_amount);
BEGIN
  INSERT INTO public.transactions
    (user_id, account_id, kind, amount, occurred_on, description, notes, transfer_group_id)
  VALUES
    (auth.uid(), p_from, 'transfer', -p_amount, p_occurred_on, p_description, p_notes, g),
    (auth.uid(), p_to, 'transfer', credited, p_occurred_on, p_description, p_notes, g);
  RETURN g;
END;
$$;--> statement-breakpoint
CREATE FUNCTION public.update_transfer(
  p_group uuid,
  p_from uuid,
  p_to uuid,
  p_amount bigint,
  p_occurred_on date,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_to_amount bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  n int;
  credited bigint := public.resolve_transfer_amount(p_from, p_to, p_amount, p_to_amount);
BEGIN
  -- The negative leg is always the source account.
  UPDATE public.transactions
  SET account_id = CASE WHEN amount < 0 THEN p_from ELSE p_to END,
      amount = CASE WHEN amount < 0 THEN -p_amount ELSE credited END,
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
REVOKE EXECUTE ON FUNCTION public.resolve_transfer_amount(uuid, uuid, bigint, bigint) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.create_transfer(uuid, uuid, bigint, date, text, text, bigint) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.update_transfer(uuid, uuid, uuid, bigint, date, text, text, bigint) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.resolve_transfer_amount(uuid, uuid, bigint, bigint) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.create_transfer(uuid, uuid, bigint, date, text, text, bigint) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.update_transfer(uuid, uuid, uuid, bigint, date, text, text, bigint) TO authenticated;