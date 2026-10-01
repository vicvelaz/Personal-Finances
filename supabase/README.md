# Supabase services

Supabase provides Auth and PostgreSQL locally and in hosted environments. `config.toml` defines the local stack; app-owned schema and migrations live in `packages/db`.

## Local services

Start/stop from the repository root with `pnpm supabase:start` / `pnpm supabase:stop`; inspect endpoints and local keys with `pnpm supabase:status`. Docker Desktop must be running. Local ports and service roles are listed in the [root README](../README.md).

The local setup includes Auth, Postgres, Studio and Mailpit. Confirmation/recovery messages are captured by Mailpit rather than sent to real addresses. Email templates are in `templates/`.

## Configuration boundaries

- `config.toml`: local Auth redirect allowlist, database version/ports, Studio, email capture and enabled Supabase services.
- `seed.sql`: development seed loaded by Supabase database reset.
- `templates/`: local/hosted Auth email templates.
- `packages/db/drizzle/`: application table, policy and function migrations.

The local Google provider is not ready for sign-in until provider credentials and matching redirects are configured. The web UI's Google button is controlled by `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`; that flag alone does not configure Supabase OAuth.

## Security and hosted operations

Public clients use the anon key plus a user's Auth session. RLS is required because that key is public. Keep service-role and database credentials on trusted servers only. The web FX endpoint also requires `CRON_SECRET`; hosting must supply the secret and schedule the endpoint separately. Scheduled database auto-posting likewise requires the relevant hosted Postgres cron configuration. Do not assume local startup enables production schedules.

For data model/policy changes, use the [database workflow](../packages/db/README.md) and verify RLS locally. For end-to-end local setup, see [root setup](../README.md).
