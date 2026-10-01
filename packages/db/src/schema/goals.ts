import {
  bigint,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { goalStatusEnum } from "./enums";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Optional account that funds the goal. */
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    currentAmount: bigint("current_amount", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("EUR"),
    targetDate: date("target_date"),
    status: goalStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("savings_goals_user_idx").on(t.userId, t.status),
    ownerOnlyPolicy("savings_goals", t.userId),
    mfaPolicy("savings_goals"),
  ],
);

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
