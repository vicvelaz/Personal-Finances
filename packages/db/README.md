# Database package

`@fin/db` is the database contract package: Drizzle table/view declarations, inferred TypeScript row types and the ordered PostgreSQL migration history. Runtime user reads/writes are made by the apps through Supabase Auth/Data API, not through this package's `postgres` driver.

## Responsibilities

- `src/schema/`: Postgres enums, tables, views and policy helpers.
- `drizzle/`: generated and hand-authored SQL migrations plus Drizzle journal/snapshots. Treat applied migration history as immutable.
- `drizzle.config.ts`: loads the root `.env`, points Drizzle Kit at the schema, and filters output to the Supabase-owned `public` schema.
- `scripts/verify-rls.sql`: focused local checks for profile creation, ownership and security rules.

The finance-workflows schema extension is additive: existing `budgets` rows receive `period = 'once'` by default, preserving their original single-month behavior. New monthly-plan rows store annual-plan overrides; budget closure and settlement rows record resumable, idempotent virtual allocations. `budget_closure_rules` stores owner-scoped automatic destinations for monthly budgets. The `run_due_budget_closure_rules` function is restricted to `service_role`; the scheduled web route calls it only after validating `CRON_SECRET`. Transactions also support the internal `adjustment` kind for account reconciliation. New owner-scoped tables include row-level security and owner/MFA policies.

Read the [schema module guide](src/schema/README.md) for table ownership and RLS conventions.

## Local database workflow

From the repository root, with Supabase running:

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:verify-rls
```

Review newly generated SQL before migration. Supabase-specific functions, triggers and policies may need hand-authored SQL in the migration history. Run the verifier after security or ownership changes; it uses the local Supabase database and rolls back test data.

Package-specific commands include `pnpm --filter @fin/db generate`, `migrate`, and `studio` (Drizzle Studio). `DATABASE_URL` must point to the intended database; do not run local migration commands against production by accident.

## Important boundary

Do not export/model `auth.users` in the Drizzle schema. Supabase owns that schema, and doing so can cause Drizzle Kit to generate invalid or destructive schema operations. Application profile rows are in `public.profiles` and are linked to Auth users through database-owned SQL logic.

Ownership and row security are part of the schema contract, not optional app configuration. A new user-owned table should have an owner policy, appropriate MFA policy where applicable, indexes/constraints, and RLS verification coverage. Database functions used by clients must validate ownership and preserve invariants independently of UI checks.
