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
import { categories } from "./categories";
import { transactionKindEnum } from "./enums";
import { savingsGoals } from "./goals";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

export const transactions = pgTable(
  "transactions",
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
    /** Signed minor units: negative for expenses, positive for income. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    occurredOn: date("occurred_on").notNull(),
    description: text("description"),
    notes: text("notes"),
    /** Set when the row was materialised from a scheduled transaction. */
    scheduledTransactionId: uuid("scheduled_transaction_id"),
    /** Counterpart row for transfers between two accounts. */
    transferGroupId: uuid("transfer_group_id"),
    /** Set on both legs of a transfer made through a savings goal contribution or withdrawal. */
    goalId: uuid("goal_id").references(() => savingsGoals.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredOn),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_transfer_group_idx").on(t.transferGroupId),
    index("transactions_goal_idx").on(t.goalId),
    ownerOnlyPolicy("transactions", t.userId),
    mfaPolicy("transactions"),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
