CREATE TABLE "exchange_rates" (
	"base" text NOT NULL,
	"quote" text NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric(20, 10) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_base_quote_rate_date_pk" PRIMARY KEY("base","quote","rate_date")
);
--> statement-breakpoint
ALTER TABLE "exchange_rates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "exchange_rates_read" ON "exchange_rates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);