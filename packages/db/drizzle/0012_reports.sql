-- Custom SQL migration file, put your code below! --
-- Aggregations for the dashboard. Base currency only, transfers excluded; RLS of the caller applies.
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
    coalesce(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)::bigint,
    coalesce(-sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0)::bigint
  FROM months m
  LEFT JOIN public.transactions t
    ON t.occurred_on >= m.month
   AND t.occurred_on < m.month + interval '1 month'
   AND t.kind IN ('income', 'expense')
   AND t.currency = (SELECT base_currency FROM base)
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
    (-sum(t.amount))::bigint AS total
  FROM public.transactions t
  LEFT JOIN public.categories c ON c.id = t.category_id
  LEFT JOIN public.categories top ON top.id = coalesce(c.parent_id, c.id)
  WHERE t.kind = 'expense'
    AND t.occurred_on BETWEEN p_from AND p_to
    AND t.currency = (SELECT base_currency FROM public.profiles WHERE id = auth.uid())
  GROUP BY top.id, top.name, top.color
  ORDER BY total DESC;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.monthly_totals(date, date) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.expenses_by_category(date, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.monthly_totals(date, date) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.expenses_by_category(date, date) TO authenticated;