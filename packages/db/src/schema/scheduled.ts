import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { categories } from "./categories";
import { recurrenceEnum, transactionKindEnum } from "./enums";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

/** Planned or estimated movements that generate real transactions when they fall due. */
export const scheduledTransactions = pgTable(
  "scheduled_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    kind: transactionKindEnum("kind").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    description: text("description").notNull(),
    recurrence: recurrenceEnum("recurrence").notNull().default("monthly"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    nextRunOn: date("next_run_on").notNull(),
    /** True when the amount is a forecast rather than a fixed commitment. */
    isEstimated: boolean("is_estimated").notNull().default(false),
    /** Days before nextRunOn to send a reminder; null disables reminders. */
    reminderDaysBefore: integer("reminder_days_before"),
    /** Posted by the post_due_scheduled cron job when due. Fixed amounts only. */
    autoPost: boolean("auto_post").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scheduled_user_next_run_idx").on(t.userId, t.nextRunOn),
    index("scheduled_active_idx").on(t.isActive, t.nextRunOn),
    check("scheduled_auto_post_fixed", sql`not (${t.autoPost} and ${t.isEstimated})`),
    check("scheduled_reminder_range", sql`${t.reminderDaysBefore} between 0 and 30`),
    ownerOnlyPolicy("scheduled_transactions", t.userId),
    mfaPolicy("scheduled_transactions"),
  ],
);

export type ScheduledTransaction = typeof scheduledTransactions.$inferSelect;
export type NewScheduledTransaction = typeof scheduledTransactions.$inferInsert;
