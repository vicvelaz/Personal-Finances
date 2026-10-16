CREATE TYPE "public"."budget_closure_status" AS ENUM('open', 'completed');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('once', 'monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."budget_settlement_destination" AS ENUM('reallocation', 'goal', 'rollover', 'expire');--> statement-breakpoint
ALTER TYPE "public"."transaction_kind" ADD VALUE 'adjustment';--> statement-breakpoint
CREATE TABLE "budget_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"status" "budget_closure_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_closures_owner_budget_period_uq" UNIQUE("user_id","budget_id","period_start")
);
--> statement-breakpoint
ALTER TABLE "budget_closures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_month_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_month_plans_budget_period_uq" UNIQUE("budget_id","period_start"),
	CONSTRAINT "budget_month_plans_amount_positive" CHECK ("budget_month_plans"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "budget_month_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"closure_id" uuid NOT NULL,
	"destination" "budget_settlement_destination" NOT NULL,
	"target_budget_id" uuid,
	"savings_goal_id" uuid,
	"target_period" date,
	"amount" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_settlements_user_idempotency_uq" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "budget_settlements_amount_positive" CHECK ("budget_settlements"."amount" > 0),
	CONSTRAINT "budget_settlements_destination_target_check" CHECK ((
        ("budget_settlements"."destination" = 'reallocation' and "budget_settlements"."target_budget_id" is not null and "budget_settlements"."savings_goal_id" is null and "budget_settlements"."target_period" is not null)
        or ("budget_settlements"."destination" = 'goal' and "budget_settlements"."target_budget_id" is null and "budget_settlements"."savings_goal_id" is not null and "budget_settlements"."target_period" is null)
        or ("budget_settlements"."destination" = 'rollover' and "budget_settlements"."target_budget_id" is not null and "budget_settlements"."savings_goal_id" is null and "budget_settlements"."target_period" is not null)
        or ("budget_settlements"."destination" = 'expire' and "budget_settlements"."target_budget_id" is null and "budget_settlements"."savings_goal_id" is null and "budget_settlements"."target_period" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "budget_settlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "period" "budget_period" DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "period_end" date;--> statement-breakpoint
ALTER TABLE "budget_closures" ADD CONSTRAINT "budget_closures_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_closures" ADD CONSTRAINT "budget_closures_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_month_plans" ADD CONSTRAINT "budget_month_plans_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_month_plans" ADD CONSTRAINT "budget_month_plans_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_settlements" ADD CONSTRAINT "budget_settlements_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_settlements" ADD CONSTRAINT "budget_settlements_closure_id_budget_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."budget_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_settlements" ADD CONSTRAINT "budget_settlements_target_budget_id_budgets_id_fk" FOREIGN KEY ("target_budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_settlements" ADD CONSTRAINT "budget_settlements_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_closures_user_period_idx" ON "budget_closures" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "budget_month_plans_user_period_idx" ON "budget_month_plans" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "budget_settlements_closure_idx" ON "budget_settlements" USING btree ("closure_id");--> statement-breakpoint
CREATE POLICY "budget_closures_owner_all" ON "budget_closures" AS PERMISSIVE FOR ALL TO "authenticated" USING ("budget_closures"."user_id" = (select auth.uid())) WITH CHECK ("budget_closures"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "budget_closures_mfa" ON "budget_closures" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())) WITH CHECK ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa()));--> statement-breakpoint
CREATE POLICY "budget_month_plans_owner_all" ON "budget_month_plans" AS PERMISSIVE FOR ALL TO "authenticated" USING ("budget_month_plans"."user_id" = (select auth.uid())) WITH CHECK ("budget_month_plans"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "budget_month_plans_mfa" ON "budget_month_plans" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())) WITH CHECK ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa()));--> statement-breakpoint
CREATE POLICY "budget_settlements_owner_all" ON "budget_settlements" AS PERMISSIVE FOR ALL TO "authenticated" USING ("budget_settlements"."user_id" = (select auth.uid())) WITH CHECK ("budget_settlements"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "budget_settlements_mfa" ON "budget_settlements" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())) WITH CHECK ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa()));