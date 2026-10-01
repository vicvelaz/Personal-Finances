import {
  bigint,
  date,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

/** One row per category per month: the planned spending limit. */
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** First day of the budgeted month. */
    periodStart: date("period_start").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("budgets_user_period_idx").on(t.userId, t.periodStart),
    unique("budgets_user_category_period_uq").on(
      t.userId,
      t.categoryId,
      t.periodStart,
    ),
    ownerOnlyPolicy("budgets", t.userId),
    mfaPolicy("budgets"),
  ],
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
