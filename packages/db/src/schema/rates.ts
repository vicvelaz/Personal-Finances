import { sql } from "drizzle-orm";
import { date, numeric, pgPolicy, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

/** Daily reference rates (1 base = rate quote). Shared read-only data; written only with the service role. */
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rateDate: date("rate_date").notNull(),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.base, t.quote, t.rateDate] }),
    pgPolicy("exchange_rates_read", { for: "select", to: authenticatedRole, using: sql`true` }),
  ],
);
