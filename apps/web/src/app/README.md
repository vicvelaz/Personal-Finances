# Web routes and flows

Next.js App Router maps folders to URL paths. Parentheses denote route groups and do not appear in URLs. Feature-specific forms and server actions stay next to their pages so the UI, mutation and revalidation behavior are easy to trace together.

## Route groups

- `(auth)`: public auth pages for `/login`, `/signup`, `/forgot-password`, `/reset-password`, and `/mfa`. `actions.ts` owns sign-in, signup, sign-out and recovery actions; the MFA route verifies a second factor before the private app is available.
- `(app)`: authenticated finance routes. Its layout verifies the user and renders the shared navigation.
- `/auth/callback` and `/auth/confirm`: OAuth and email-link/code return paths handled by route handlers.
- `/api/export`: authenticated personal-data export and account-deletion operations.
- `/api/cron/fx`: protected exchange-rate update endpoint; callers must provide the configured cron bearer secret.

## Private screens

| URL                    | Purpose                                            | Main implementation                      |
| ---------------------- | -------------------------------------------------- | ---------------------------------------- |
| `/`                    | Dashboard, balances and reports                    | `(app)/page.tsx`, `dashboard-charts.tsx` |
| `/transactions`        | Ledger, create/edit, transfer and split workflows  | `(app)/transactions/`                    |
| `/transactions/import` | CSV mapping, preview, validation and insert        | `(app)/transactions/import/`             |
| `/accounts`            | Account list, create/edit and delete guards        | `(app)/accounts/`                        |
| `/categories`          | Category CRUD                                      | `(app)/categories/`                      |
| `/budgets`             | Category budget setup and progress                 | `(app)/budgets/`                         |
| `/scheduled`           | Recurrence setup and generated occurrences         | `(app)/scheduled/`                       |
| `/goals`               | Savings goals and linked contributions/withdrawals | `(app)/goals/`                           |
| `/profile`             | User profile, MFA, export and account deletion     | `(app)/profile/`                         |

## Mutation path

For a typical form, the colocated server action parses submitted values using `@fin/shared`, verifies the authenticated user, then writes with the user's Supabase server client or calls a database RPC for an atomic multi-row operation. RLS and database constraints remain authoritative. On success, the action revalidates affected paths and redirects or returns action state for the form.

When changing a flow, check whether related lists, dashboard, budget/report views or both legs of a transfer also need revalidation. Treat CSV import and export as data-rights/security-sensitive paths; never route secrets into client components.

See [web services](../lib/README.md) for Supabase client/session boundaries and [architecture](../../../../docs/architecture.md) for data/security decisions.
