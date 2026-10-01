import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { categoryKindEnum } from "./enums";
import { mfaPolicy, ownerOnlyPolicy } from "./policies";
import { profiles } from "./profiles";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull().default("expense"),
    color: text("color"),
    icon: text("icon"),
    /** Optional hard spending cap in minor units, evaluated per calendar month. */
    monthlyLimit: bigint("monthly_limit", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("categories_user_id_idx").on(t.userId),
    // Uniqueness lives in migration 0005 (lower(name), NULLS NOT DISTINCT), which drizzle cannot express.
    ownerOnlyPolicy("categories", t.userId),
    mfaPolicy("categories"),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
