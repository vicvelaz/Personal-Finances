# Architecture

## At a glance

fin is a pnpm/Turborepo monorepo with two clients, two reusable TypeScript packages, and Supabase as the identity and data platform.

```mermaid
flowchart LR
  Web[Next.js web app] -->|SSR cookies / user JWT| Supabase[Supabase Auth + Data API]
  Mobile[Expo app] -->|anon key / user JWT| Supabase
  Web --> Shared[@fin/shared]
  Mobile --> Shared
  Web --> DbPkg[@fin/db schema types]
  Supabase --> Postgres[(Postgres + RLS / functions / views)]
  DbPkg -. schema + migrations .-> Postgres
```

| Part                   | Location          | Responsibility                                                                                       |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| Web client             | `apps/web`        | Authenticated browser experience, server-rendered routes, server actions and scheduled/API endpoints |
| Mobile client          | `apps/mobile`     | iOS, Android and web app using Expo Router, React Query and native integrations                      |
| Shared domain          | `packages/shared` | Platform-neutral Zod schemas, domain helpers, Spanish/English catalog, error mapping and tests       |
| Database definition    | `packages/db`     | Drizzle schema/types and ordered SQL migrations for the public Postgres schema                       |
| Backend services       | `supabase`        | Local/hosted Auth, Postgres, RLS, SQL functions, email templates and local seed/config               |
| Product specifications | `openspec`        | Feature requirements, design decisions, task plans and archived change records                       |

## Why these technologies

- **pnpm workspaces + Turborepo:** keep both clients and shared packages in one versioned codebase, with dependency-aware build and check tasks. The root package pins the package manager version.
- **Next.js App Router:** web pages can read authenticated data on the server and perform mutations with server actions, while the same app still supports interactive client components and API routes.
- **Expo Router / React Native:** one route tree and UI codebase can target iOS, Android and web; device-only behavior such as SecureStore and local notifications stays behind mobile services.
- **Supabase Auth + Postgres:** a managed identity provider and PostgreSQL database provide the same local development stack through the Supabase CLI. The clients use user sessions rather than a custom application server for ordinary data access.
- **Drizzle:** the schema is expressed in TypeScript alongside inferred row types, and schema changes produce reviewable, ordered SQL migrations. Supabase-specific policies and functions remain SQL/database concerns.
- **Zod + `@fin/shared`:** validation and domain behavior have one platform-independent contract, testable without either UI runtime.
- **Shared localization catalog:** profile locales retain regional date/number formatting while selecting a message language. Dotted English keys are grouped by domain; adding a language requires one catalog with the same typed key shape. Both clients share UI and validation/error messages; user-entered names and descriptions are not translated.
- **TanStack Query on mobile:** centralizes asynchronous query/mutation state and cache invalidation for screens that call Supabase directly.
- **Integer minor units for money:** persisted and computed amounts use integer cents (or the currency's minor-unit convention used by the app) instead of floating-point arithmetic. Currency conversions are explicit and rates are stored separately.

These choices avoid duplicating core validation between clients while preserving platform-specific authentication storage, navigation and UI behavior.

## Request and data flow

### Web

`src/proxy.ts` delegates cookie/session refresh to the Supabase SSR proxy helper. The authenticated route-group layout verifies the user with `auth.getUser()` before rendering private UI. Server components and server actions use the cookie-bound server client, which forwards the current user's JWT to Supabase; Postgres RLS is still the data authorization boundary. Mutations validate input with `@fin/shared`, call the Data API or a database RPC, then revalidate affected paths.

### Mobile

The root Expo layout creates the React Query client and session provider. Supabase Auth persists native sessions through Expo SecureStore; protected route groups distinguish signed-out, signed-in and MFA-required sessions. Feature libraries expose queries and mutations to route components. Those calls use the logged-in user's JWT and are constrained by the same RLS policies as web.

### Database

Drizzle declarations in `packages/db/src/schema` describe tables, views and reusable policies in the `public` schema. `packages/db/drizzle` contains the migration history. SQL functions/triggers enforce multi-row operations and important invariants in the database, including ownership-sensitive transfers and split totals. RLS policies scope user-owned records and require an AAL2 session when a user has a verified MFA factor.

Never add `auth.users` to the Drizzle schema: Supabase owns the `auth` schema. See [database development notes](../packages/db/README.md) before changing tables, functions or RLS.

## Domain model and key flows

- **Accounts and transactions:** accounts have a currency; transactions are signed integer amounts. Transfers are represented by paired transaction rows grouped by `transfer_group_id`, with database RPCs keeping the two legs consistent. A linked savings-goal movement also associates both legs with its goal. Reconciliation adjustments change account balances but are immutable, uncategorized, unsplittable, and labeled "Ajuste de saldo / No contabilizado"; they are excluded from income/expense reports, budgets, and ordinary CSV exports.
- **Splits and reporting:** an expense/income can be allocated to categorized split rows. The `transaction_lines` view presents split-aware amounts for budget/report calculations; consumers should use the shared report logic or this view rather than independently summing parent plus children. Report and budget calculations include only expense/income rows, never reconciliation adjustments.
- **Budgets and goals:** budgets compare category spending against limits. Savings goals track a target, progress and optional linked-account movements.
- **Scheduled transactions:** recurrence data produces upcoming occurrences. The database function `post_due_scheduled()` materializes due items when scheduled automation is enabled; mobile local reminders are a separate convenience and do not create transactions.
- **Currencies and reporting:** exchange rates are maintained independently from ledger values. Reports/net-worth views convert for presentation; cross-currency transfers store an explicit destination amount rather than silently assuming a rate.
- **Data rights:** export is a server endpoint; account deletion requires explicit confirmation and reauthentication, then invokes a database function that removes the user's owned data.
- **CSV import/export:** the canonical header is `date, amount, type, category, account, description` plus optional `destination_account` (any order/case; unknown or repeated columns fail with `INVALID_CSV_HEADER`). `type` (`EXPENSE`/`INCOME`/`TRANSFER`) decides the sign; amounts are parsed to exact minor units. The browser parses and stages up to 1000 rows (paged 10/25/50, editable category, selection/deletion), then confirms through the authenticated `POST /api/v1/transactions/batch` (session client + RLS). The server resolves account names to unique active accounts (blank source uses the chosen default; destinations never do), rejects cross-currency transfers, skips duplicates and creates each transfer through `create_transfer` so both legs are atomic. The ordinary export uses the same header, writes each transfer once (source leg plus `destination_account`) and omits balance adjustments, so it can be re-imported.

## Security boundaries

- The Supabase anon key is public and must be paired with correct RLS. It is not an authorization substitute.
- Never send `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` or `CRON_SECRET` to client code. Expo's `EXPO_PUBLIC_*` and Next's `NEXT_PUBLIC_*` values are bundled/exposed.
- Server-only elevated operations need explicit authentication/authorization and must stay in server route handlers. Normal user CRUD should keep the user JWT so RLS applies.
- Database constraints/functions are the final guard for invariants that span multiple rows or clients; UI validation improves feedback but is not the security boundary.
- Cron routes authenticate with `CRON_SECRET`; hosted schedules and provider credentials are operational configuration, not repository defaults.

## Where to start a change

1. Locate the matching requirement under `openspec/specs/` or propose a change using the repository's OpenSpec workflow.
2. Put cross-platform parsing/validation in `packages/shared/src`; keep device/UI behavior in the owning app.
3. For persistent model or invariant changes, update `packages/db/src/schema`, generate/review a migration, and verify RLS.
4. Update the relevant app service/action and route, then tests and the nearby module README if its responsibilities or flow changed.
5. Run the focused package checks, then the root checks described in [development workflow](development.md).
