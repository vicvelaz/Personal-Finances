-- Budget progress per period type: once (one month), monthly (month plan + virtual rollovers/reallocations) and annual (natural year).
DROP FUNCTION public.budget_progress(date);--> statement-breakpoint
CREATE FUNCTION public.budget_progress(p_month date)
RETURNS TABLE (
  budget_id uuid,
  category_id uuid,
  category_name text,
  color text,
  parent_id uuid,
  amount bigint,
  spent bigint,
  period public.budget_period,
  period_start date,
  period_end date,
  base_amount bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH m AS (SELECT date_trunc('month', p_month)::date AS month)
  SELECT
    b.id,
    c.id,
    c.name,
    c.color,
    c.parent_id,
    CASE WHEN b.period = 'monthly' THEN coalesce(mp.amount, b.amount) + coalesce(funded.amount, 0) ELSE b.amount END::bigint,
    coalesce((
      SELECT -sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on))
      FROM public.transaction_lines l
      JOIN public.categories tc ON tc.id = l.category_id
      WHERE l.kind = 'expense'
        AND l.occurred_on >= CASE WHEN b.period = 'annual' THEN date_trunc('year', m.month)::date ELSE m.month END
        AND l.occurred_on < CASE WHEN b.period = 'annual' THEN (date_trunc('year', m.month) + interval '1 year')::date
                                 ELSE (m.month + interval '1 month')::date END
        AND (tc.id = c.id OR tc.parent_id = c.id)
    ), 0)::bigint,
    b.period,
    b.period_start,
    b.period_end,
    b.amount
  FROM m
  JOIN public.budgets b
    ON (b.period = 'once' AND b.period_start = m.month)
    OR (b.period <> 'once' AND b.period_start <= m.month AND (b.period_end IS NULL OR b.period_end >= m.month))
  JOIN public.categories c ON c.id = b.category_id
  JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN public.budget_month_plans mp ON mp.budget_id = b.id AND mp.period_start = m.month
  LEFT JOIN LATERAL (
    SELECT sum(s.amount)::bigint AS amount
    FROM public.budget_settlements s
    WHERE s.target_budget_id = b.id AND s.target_period = m.month AND s.destination IN ('reallocation', 'rollover')
  ) funded ON true
  ORDER BY c.name;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.budget_progress(date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.budget_progress(date) TO authenticated;--> statement-breakpoint
-- Copies only one-off budgets and never into a month already covered by another period of the category.
CREATE OR REPLACE FUNCTION public.copy_budgets(p_from date, p_to date)
RETURNS int
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  n int;
  target date := date_trunc('month', p_to)::date;
BEGIN
  INSERT INTO public.budgets (user_id, category_id, period_start, amount)
  SELECT auth.uid(), b.category_id, target, b.amount
  FROM public.budgets b
  WHERE b.period = 'once'
    AND b.period_start = date_trunc('month', p_from)::date
    AND NOT EXISTS (
      SELECT 1 FROM public.budgets o
      WHERE o.user_id = b.user_id AND o.category_id = b.category_id
        AND ((o.period = 'once' AND o.period_start = target)
          OR (o.period <> 'once' AND o.period_start <= target AND (o.period_end IS NULL OR o.period_end >= target)))
    )
  ON CONFLICT (user_id, category_id, period_start) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;--> statement-breakpoint
-- Year-to-date spending per recurring budget (base currency, split-aware, adjustments and transfers excluded).
CREATE FUNCTION public.budget_year_spent(p_year date)
RETURNS TABLE (budget_id uuid, spent bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    b.id,
    coalesce((
      SELECT -sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on))
      FROM public.transaction_lines l
      JOIN public.categories tc ON tc.id = l.category_id
      WHERE l.kind = 'expense'
        AND l.occurred_on >= date_trunc('year', p_year)::date
        AND l.occurred_on < (date_trunc('year', p_year) + interval '1 year')::date
        AND (tc.id = c.id OR tc.parent_id = c.id)
    ), 0)::bigint
  FROM public.budgets b
  JOIN public.categories c ON c.id = b.category_id
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.period <> 'once'
    AND b.period_start <= (date_trunc('year', p_year) + interval '1 year' - interval '1 day')::date
    AND (b.period_end IS NULL OR b.period_end >= date_trunc('year', p_year)::date);
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.budget_year_spent(date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.budget_year_spent(date) TO authenticated;