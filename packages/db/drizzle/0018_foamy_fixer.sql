CREATE TABLE "transaction_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" bigint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_splits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_splits_transaction_idx" ON "transaction_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_splits_category_idx" ON "transaction_splits" USING btree ("category_id");--> statement-breakpoint
CREATE VIEW "public"."transaction_lines" WITH (security_invoker = true) AS (select "transactions"."id" as "transaction_id", "transactions"."user_id", "transactions"."account_id", "transactions"."kind", "transactions"."occurred_on", "transactions"."currency", case when "transaction_splits"."id" is null then "transactions"."category_id" else "transaction_splits"."category_id" end as "category_id", coalesce("transaction_splits"."amount", "transactions"."amount") as "amount" from "transactions" left join "transaction_splits" on "transaction_splits"."transaction_id" = "transactions"."id");--> statement-breakpoint
CREATE POLICY "transaction_splits_owner_all" ON "transaction_splits" AS PERMISSIVE FOR ALL TO "authenticated" USING ("transaction_splits"."user_id" = (select auth.uid())) WITH CHECK ("transaction_splits"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "transaction_splits_mfa" ON "transaction_splits" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())) WITH CHECK ((select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa()));