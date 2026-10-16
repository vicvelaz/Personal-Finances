-- Split-aware monthly category spending, active limits and virtual closure destinations.
CREATE FUNCTION public.category_budget_history(p_category_id uuid, p_through_month date)
RETURNS TABLE (
  month_start date,
  budget_amount bigint,
  spent bigint,
  reallocated bigint,
  goal_sweep bigint,
  rollover bigint,
  expired bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH params AS (
    SELECT
      auth.uid() AS user_id,
      date_trunc('month', p_through_month)::date AS through_month,
      p.base_currency
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.categories c
        WHERE c.id = p_category_id AND c.user_id = p.id
      )
  ),
  months AS (
    SELECT generate_series(
      p.through_month - interval '11 months',
      p.through_month,
      interval '1 month'
    )::date AS month_start
    FROM params p
  ),
  month_budgets AS (
    SELECT
      m.month_start,
      b.id AS budget_id,
      CASE
        WHEN b.period = 'annual' THEN round(b.amount / 12.0)::bigint
        WHEN b.period = 'monthly' THEN coalesce(mp.amount, b.amount)
        ELSE b.amount
      END
      + coalesce((
        SELECT sum(s.amount)::bigint
        FROM public.budget_settlements s
        WHERE s.user_id = b.user_id
          AND s.target_budget_id = b.id
          AND s.target_period = m.month_start
          AND s.destination IN ('reallocation', 'rollover')
      ), 0) AS amount
    FROM months m
    JOIN params p ON true
    JOIN public.budgets b
      ON b.user_id = p.user_id
      AND b.category_id = p_category_id
      AND b.period_start <= m.month_start
      AND (b.period_end IS NULL OR b.period_end >= m.month_start)
      AND (b.period <> 'once' OR b.period_start = m.month_start)
    LEFT JOIN public.budget_month_plans mp
      ON mp.user_id = p.user_id
      AND mp.budget_id = b.id
      AND mp.period_start = m.month_start
  ),
  spending AS (
    SELECT
      m.month_start,
      coalesce((
        SELECT -sum(public.convert_amount(l.amount, l.currency, p.base_currency, l.occurred_on))
        FROM public.transaction_lines l
        JOIN public.categories c ON c.id = l.category_id
        WHERE l.user_id = p.user_id
          AND l.kind = 'expense'
          AND l.occurred_on >= m.month_start
          AND l.occurred_on < m.month_start + interval '1 month'
          AND (c.id = p_category_id OR c.parent_id = p_category_id)
      ), 0)::bigint AS amount
    FROM months m
    JOIN params p ON true
  ),
  destinations AS (
    SELECT
      bc.period_start AS month_start,
      coalesce(sum(s.amount) FILTER (WHERE s.destination = 'reallocation'), 0)::bigint AS reallocated,
      coalesce(sum(s.amount) FILTER (WHERE s.destination = 'goal'), 0)::bigint AS goal_sweep,
      coalesce(sum(s.amount) FILTER (WHERE s.destination = 'rollover'), 0)::bigint AS rollover,
      coalesce(sum(s.amount) FILTER (WHERE s.destination = 'expire'), 0)::bigint AS expired
    FROM public.budget_closures bc
    JOIN public.budgets b ON b.id = bc.budget_id
    JOIN public.budget_settlements s ON s.closure_id = bc.id
    JOIN params p ON p.user_id = bc.user_id
    WHERE b.category_id = p_category_id
    GROUP BY bc.period_start
  )
  SELECT
    m.month_start,
    coalesce(sum(mb.amount), 0)::bigint,
    coalesce(sp.amount, 0)::bigint,
    coalesce(d.reallocated, 0)::bigint,
    coalesce(d.goal_sweep, 0)::bigint,
    coalesce(d.rollover, 0)::bigint,
    coalesce(d.expired, 0)::bigint
  FROM months m
  LEFT JOIN month_budgets mb ON mb.month_start = m.month_start
  LEFT JOIN spending sp ON sp.month_start = m.month_start
  LEFT JOIN destinations d ON d.month_start = m.month_start
  GROUP BY m.month_start, sp.amount, d.reallocated, d.goal_sweep, d.rollover, d.expired
  ORDER BY m.month_start;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.category_budget_history(uuid, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.category_budget_history(uuid, date) TO authenticated;
