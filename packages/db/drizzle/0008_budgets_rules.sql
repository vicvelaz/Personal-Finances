-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION public.validate_budget()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.period_start := date_trunc('month', NEW.period_start)::date;
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'budget_invalid_amount' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = NEW.category_id AND user_id = NEW.user_id AND kind = 'expense'
  ) THEN
    RAISE EXCEPTION 'budget_invalid_category' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS budgets_validate ON public.budgets;--> statement-breakpoint
CREATE TRIGGER budgets_validate
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget();--> statement-breakpoint
-- Spent per budget in the caller's base currency; parent categories include their children. RLS applies.
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
      SELECT -sum(t.amount)
      FROM public.transactions t
      JOIN public.categories tc ON tc.id = t.category_id
      WHERE t.kind = 'expense'
        AND t.currency = p.base_currency
        AND t.occurred_on >= b.period_start
        AND t.occurred_on < (b.period_start + interval '1 month')
        AND (tc.id = c.id OR tc.parent_id = c.id)
    ), 0)::bigint
  FROM public.budgets b
  JOIN public.categories c ON c.id = b.category_id
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.period_start = date_trunc('month', p_month)::date
  ORDER BY c.name;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.copy_budgets(p_from date, p_to date)
RETURNS int
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  n int;
BEGIN
  INSERT INTO public.budgets (user_id, category_id, period_start, amount)
  SELECT auth.uid(), b.category_id, date_trunc('month', p_to)::date, b.amount
  FROM public.budgets b
  WHERE b.period_start = date_trunc('month', p_from)::date
  ON CONFLICT (user_id, category_id, period_start) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.budget_progress(date) FROM PUBLIC, anon;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.copy_budgets(date, date) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.budget_progress(date) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.copy_budgets(date, date) TO authenticated;