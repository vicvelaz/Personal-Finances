import { sql } from "drizzle-orm";
import { type AnyPgColumn, pgPolicy } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

/** RLS: authenticated users can only read and write rows they own. No anon policy means anon is denied. */
export function ownerOnlyPolicy(table: string, ownerColumn: AnyPgColumn) {
  return pgPolicy(`${table}_owner_all`, {
    as: "permissive",
    for: "all",
    to: authenticatedRole,
    using: sql`${ownerColumn} = ${authUid}`,
    withCheck: sql`${ownerColumn} = ${authUid}`,
  });
}

/** RLS (restrictive): users with a verified MFA factor need an aal2 session to touch their data. */
export function mfaPolicy(table: string) {
  const check = sql`(select auth.jwt() ->> 'aal') = 'aal2' or not (select public.has_verified_mfa())`;
  return pgPolicy(`${table}_mfa`, {
    as: "restrictive",
    for: "all",
    to: authenticatedRole,
    using: check,
    withCheck: check,
  });
}
