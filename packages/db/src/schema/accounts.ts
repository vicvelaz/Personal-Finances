import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { accountTypeEnum } from "./enums";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull().default("checking"),
    currency: text("currency").notNull().default("EUR"),
    /** Opening balance in minor units (cents). Current balance is derived from transactions. */
    openingBalance: bigint("opening_balance", { mode: "number" })
      .notNull()
      .default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    ownerOnlyPolicy("accounts", t.userId),
    mfaPolicy("accounts"),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
