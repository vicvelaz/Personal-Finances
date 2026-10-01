# Development workflow

## First run

Use the complete [root setup guide](../README.md). In short: install with pnpm, configure root `.env` and `apps/mobile/.env` from their examples, start Supabase with Docker, copy the local URL/anon key into each environment file, migrate, then start the desired app. The web and mobile guides explain device-specific details.

## Daily commands

Run from the repository root:

```sh
pnpm web
pnpm mobile
pnpm typecheck
pnpm lint
pnpm test
pnpm db:verify-rls
```

`pnpm dev` starts all persistent app development targets via Turbo. `pnpm test` runs the tests defined by packages; currently the domain test suite is in `@fin/shared`. Web typecheck generates Next route types first. Mobile exposes lint and TypeScript checks but no separate unit-test script.

## Making a feature change

1. Check the domain requirement and existing change state in `openspec/`. Keep requirements, design and task lists coherent. Completed changes are archived; edit the current spec or create a new proposal rather than treating an archived task list as the live source of implementation details.
2. Trace the owning flow using the module README and nearby tests. Put reusable input contracts/domain rules in `packages/shared`, not in a platform-specific form.
3. Implement the narrowest owning layer. Treat client-side validation as usability only; preserve server authorization and database rules.
4. Add or update focused tests. For schema/security work, run `pnpm db:verify-rls` against local Supabase.
5. Run `pnpm typecheck`, `pnpm lint` and `pnpm test`; run `pnpm --filter @fin/web build` for web route/build changes. Update docs beside a changed module/flow.

## Database changes

Edit Drizzle declarations under `packages/db/src/schema`, then generate with `pnpm db:generate`. Inspect the SQL under `packages/db/drizzle` before applying it. Hand-authored SQL may be required for Supabase-specific policies, triggers or functions; add it to the migration history using the existing conventions and review the final SQL. Apply locally with `pnpm db:migrate` and verify ownership/security rules with `pnpm db:verify-rls`.

The Drizzle config loads the root `.env` and filters to `public`. Do not model Supabase-owned schemas such as `auth` in the exported Drizzle schema. Migrations are ordered and persistent: never edit an already-applied migration to change behavior; add a new migration instead. See [database notes](../packages/db/README.md).

## Environment and secrets

- Root `.env`: web public Supabase configuration plus server-only `DATABASE_URL`, optional `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and optional Google sign-in flag.
- `apps/mobile/.env`: only `EXPO_PUBLIC_*` client values. These values are part of the distributed app.
- Do not commit local environment files or copy service-role/database/cron secrets into either client.
- For phones/tablets, use the development machine's LAN IP for local Supabase; loopback addresses resolve on the device itself.

## Troubleshooting

- **Supabase will not start:** confirm Docker Desktop is running, then run `pnpm supabase:status`.
- **Auth/API requests fail locally:** check the URL and anon key against `pnpm supabase:status`, then restart the affected dev server after changing env values.
- **Migrations fail:** confirm Supabase is running and `DATABASE_URL` points to local Postgres on `54322`; inspect the generated SQL before retrying.
- **Email confirmation/recovery:** inspect Mailpit at <http://127.0.0.1:54324>.
- **Mobile cannot reach Supabase on a physical device:** replace `127.0.0.1` with the computer's LAN IP and ensure both devices are on the same network.
- **Typecheck complains about Next route props:** use the web package script, which runs `next typegen` first.

## Keeping documentation useful

Document why a boundary exists, not every line of implementation. When adding a service, route group, package, database subsystem or recurring workflow, update its nearby README and the architecture map. Keep root setup commands aligned with `package.json`, package scripts and the env examples.
