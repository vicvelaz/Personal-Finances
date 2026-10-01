# Schema modules

This folder is the TypeScript source of truth for the app-owned portion of Supabase's `public` PostgreSQL schema. `index.ts` exports the definitions used by Drizzle Kit; each domain file declares its own tables and row types.

## Domain map

- `profiles.ts`: app profile linked to the authenticated Supabase user.
- `accounts.ts`: user-owned financial accounts and account constraints.
- `categories.ts`: user-owned transaction categories.
- `transactions.ts`: income, expenses and transfer legs.
- `splits.ts`: category allocations and the split-aware transaction-lines view.
- `budgets.ts`: category spending limits.
- `scheduled.ts`: recurring transaction rules and automation fields.
- `goals.ts`: savings targets and linked movements.
- `rates.ts`: exchange-rate storage used for display/report conversion.
- `views.ts`: read models such as account balances and transaction lines.
- `enums.ts`: Postgres enum definitions.
- `policies.ts`: shared RLS policy builders for owner isolation and MFA requirements.

## Conventions

Keep schema declarations focused on Postgres structure and infer row types from Drizzle. Put cross-platform parsing and form validation in `@fin/shared`. Put atomic multi-record invariants in constraints, triggers or RPC functions in SQL migrations so both clients receive the same guarantees.

For every user-owned table, enable RLS and apply an ownership policy; absence of an anon policy should mean anonymous access is denied. Consider the restrictive MFA policy for sensitive user data. Keep Supabase system schemas out of this package. After changing policies, triggers, functions or ownership, run `pnpm db:verify-rls`.
