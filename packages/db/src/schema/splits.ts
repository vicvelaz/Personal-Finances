import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";
import { transactions } from "./transactions";

/** Parts of an expense/income assigned to different categories. They must add up to the parent amount. */
export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** Signed minor units, same sign as the parent transaction. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transaction_splits_transaction_idx").on(t.transactionId),
    index("transaction_splits_category_idx").on(t.categoryId),
    ownerOnlyPolicy("transaction_splits", t.userId),
    mfaPolicy("transaction_splits"),
  ],
);

export type TransactionSplit = typeof transactionSplits.$inferSelect;
