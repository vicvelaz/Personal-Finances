import { sql } from "drizzle-orm";
import {
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";
import { mfaPolicy } from "./policies";

/** Supabase-managed auth.users. Not exported so drizzle-kit never tries to create or alter it. */
const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

// Rows are created by the handle_new_user trigger and removed by cascade, so users get no insert/delete.
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    baseCurrency: text("base_currency").notNull().default("EUR"),
    locale: text("locale").notNull().default("es-ES"),
    timezone: text("timezone").notNull().default("Europe/Madrid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    pgPolicy("profiles_owner_select", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} = ${authUid}`,
    }),
    pgPolicy("profiles_owner_update", {
      for: "update",
      to: authenticatedRole,
      using: sql`${t.id} = ${authUid}`,
      withCheck: sql`${t.id} = ${authUid}`,
    }),
    mfaPolicy("profiles"),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
