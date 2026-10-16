CREATE TABLE "budget_closure_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"destination" "budget_settlement_destination" NOT NULL,
	"target_budget_id" uuid,
	"savings_goal_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_closure_rules_user_budget_uq" UNIQUE("user_id","budget_id"),
	CONSTRAINT "budget_closure_rules_target_check" CHECK ((
        ("budget_closure_rules"."destination" = 'reallocation' and "budget_closure_rules"."target_budget_id" is not null and "budget_closure_rules"."savings_goal_id" is null)
        or ("budget_closure_rules"."destination" = 'goal' and "budget_closure_rules"."target_budget_id" is null and "budget_closure_rules"."savings_goal_id" is not null)
        or ("budget_closure_rules"."destination" = 'rollover' and "budget_closure_rules"."target_budget_id" = "budget_closure_rules"."budget_id" and "budget_closure_rules"."savings_goal_id" is null)
        or ("budget_closure_rules"."destination" = 'expire' and "budget_closure_rules"."target_budget_id" is null and "budget_closure_rules"."savings_goal_id" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "budget_closure_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_closure_rules" ADD CONSTRAINT "budget_closure_rules_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_closure_rules" ADD CONSTRAINT "budget_closure_rules_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_closure_rules" ADD CONSTRAINT "budget_closure_rules_target_budget_id_budgets_id_fk" FOREIGN KEY ("target_budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_closure_rules" ADD CONSTRAINT "budget_closure_rules_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_closure_rules_active_idx" ON "budget_closure_rules" USING btree ("is_active","budget_id");--> statement-breakpoint
CREATE POLICY "budget_closure_rules_owner_all" ON "budget_closure_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING ("budget_closure_rules"."user_id" = (select auth.uid())) WITH CHECK ("budget_closure_rules"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "budget_closure_rules_mfa" ON "budget_closure_rules" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())) WITH CHECK ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa()));
--> statement-breakpoint
CREATE FUNCTION public.validate_budget_closure_rule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  source public.budgets;
  target public.budgets;
  goal public.savings_goals;
  base_currency text;
BEGIN
  SELECT * INTO source
  FROM public.budgets
  WHERE id = NEW.budget_id AND user_id = NEW.user_id;
  IF NOT FOUND OR source.period <> 'monthly' THEN
    RAISE EXCEPTION 'budget_rule_requires_monthly_budget' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.destination = 'reallocation' THEN
    SELECT * INTO target
    FROM public.budgets
    WHERE id = NEW.target_budget_id AND user_id = NEW.user_id;
    IF NOT FOUND OR target.id = source.id OR target.period = 'annual' THEN
      RAISE EXCEPTION 'budget_invalid_target' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.destination = 'goal' THEN
    SELECT * INTO goal
    FROM public.savings_goals
    WHERE id = NEW.savings_goal_id AND user_id = NEW.user_id;
    SELECT p.base_currency INTO base_currency
    FROM public.profiles p WHERE p.id = NEW.user_id;
    IF goal.id IS NULL OR goal.status <> 'active' OR goal.currency <> base_currency THEN
      RAISE EXCEPTION 'budget_invalid_goal' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.destination = 'rollover' AND NEW.target_budget_id IS DISTINCT FROM source.id THEN
    RAISE EXCEPTION 'budget_invalid_destination' USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER budget_closure_rules_validate
  BEFORE INSERT OR UPDATE ON public.budget_closure_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_budget_closure_rule();--> statement-breakpoint
CREATE FUNCTION public.run_due_budget_closure_rules(p_period_start date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rule record;
  source_limit bigint;
  source_spent bigint;
  already_settled bigint;
  remaining bigint;
  settle_amount bigint;
  target_limit bigint;
  target_spent bigint;
  target_funded bigint;
  closure_id uuid;
  processed integer := 0;
  old_claims text := current_setting('request.jwt.claims', true);
  old_sub text := current_setting('request.jwt.claim.sub', true);
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'budget_cron_forbidden' USING ERRCODE = 'P0001';
  END IF;
  IF p_period_start IS NULL
     OR p_period_start <> date_trunc('month', p_period_start)::date
     OR p_period_start >= date_trunc('month', current_date)::date THEN
    RAISE EXCEPTION 'budget_cron_invalid_period' USING ERRCODE = 'P0001';
  END IF;

  FOR rule IN
    SELECT r.*, b.period_start, b.period_end
    FROM public.budget_closure_rules r
    JOIN public.budgets b ON b.id = r.budget_id AND b.user_id = r.user_id
    WHERE r.is_active
      AND b.period = 'monthly'
      AND b.period_start <= p_period_start
      AND (b.period_end IS NULL OR b.period_end >= p_period_start)
    ORDER BY r.user_id, r.budget_id
  LOOP
    PERFORM pg_catalog.set_config(
      'request.jwt.claims',
      pg_catalog.jsonb_build_object('sub', rule.user_id, 'role', 'authenticated', 'aal', 'aal2')::text,
      true
    );
    PERFORM pg_catalog.set_config('request.jwt.claim.sub', rule.user_id::text, true);

    SELECT bp.amount, bp.spent INTO source_limit, source_spent
    FROM public.budget_progress(p_period_start) bp
    WHERE bp.budget_id = rule.budget_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT bc.id, coalesce(sum(s.amount), 0)::bigint
    INTO closure_id, already_settled
    FROM public.budget_closures bc
    LEFT JOIN public.budget_settlements s ON s.closure_id = bc.id
    WHERE bc.user_id = rule.user_id
      AND bc.budget_id = rule.budget_id
      AND bc.period_start = p_period_start
    GROUP BY bc.id;

    IF closure_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.budget_closures bc
      WHERE bc.id = closure_id AND bc.status = 'completed'
    ) THEN
      CONTINUE;
    END IF;

    remaining := source_limit - source_spent - coalesce(already_settled, 0);
    IF remaining <= 0 THEN
      PERFORM public.complete_budget_closure(rule.budget_id, p_period_start);
      processed := processed + 1;
      CONTINUE;
    END IF;

    settle_amount := remaining;
    IF rule.destination = 'reallocation' THEN
      SELECT bp.amount, bp.spent INTO target_limit, target_spent
      FROM public.budget_progress(p_period_start) bp
      WHERE bp.budget_id = rule.target_budget_id;
      IF NOT FOUND THEN
        CONTINUE;
      END IF;
      SELECT coalesce(sum(s.amount), 0)::bigint INTO target_funded
      FROM public.budget_settlements s
      JOIN public.budget_closures c ON c.id = s.closure_id
      WHERE s.user_id = rule.user_id
        AND s.target_budget_id = rule.target_budget_id
        AND s.target_period = p_period_start
        AND s.destination IN ('reallocation', 'rollover');
      settle_amount := least(remaining, greatest(target_spent - target_limit - target_funded, 0));
      IF settle_amount <= 0 THEN
        CONTINUE;
      END IF;
    END IF;

    PERFORM public.apply_budget_settlement(
      rule.budget_id,
      p_period_start,
      rule.destination,
      settle_amount,
      pg_catalog.format(
        'auto:%s:%s:%s:%s',
        rule.budget_id,
        p_period_start,
        rule.destination,
        settle_amount
      ),
      rule.target_budget_id,
      rule.savings_goal_id,
      CASE
        WHEN rule.destination = 'reallocation' THEN p_period_start
        WHEN rule.destination = 'rollover' THEN (p_period_start + interval '1 month')::date
        ELSE NULL
      END
    );
    processed := processed + 1;
  END LOOP;

  PERFORM pg_catalog.set_config('request.jwt.claims', coalesce(old_claims, ''), true);
  PERFORM pg_catalog.set_config('request.jwt.claim.sub', coalesce(old_sub, ''), true);
  RETURN processed;
END;
$$;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.run_due_budget_closure_rules(date) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.run_due_budget_closure_rules(date) TO service_role;