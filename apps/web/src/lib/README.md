# Web services

These modules are the web application's server/client integration boundary. Domain validation belongs in `@fin/shared`; routes own presentation and most feature-specific mutations.

## Supabase clients

- `supabase/client.ts`: browser client for interactions that genuinely need client-side Auth/Data API access.
- `supabase/server.ts`: request-scoped server client backed by Next cookies. `getUser()` validates the session with Supabase Auth; do not trust a decoded cookie as proof of identity.
- `supabase/proxy.ts`: updates Supabase auth cookies during request handling. `src/proxy.ts` applies it across application routes; the private route-group layout performs a second user check before rendering.

Use the anon key and the current user's session for ordinary records so RLS applies. Elevated credentials must remain server-only and limited to operations that require them.

## Other helpers

- `transactions.ts`: web ledger read/query helpers shared by server-rendered pages.
- `profile.ts`: profile data helpers used by authenticated profile flows.

Feature writes often remain in `src/app/(app)/<feature>/actions.ts` instead of being hidden in a generic service layer. This keeps input parsing, RPC choice and route revalidation visible beside the UI. Use the shared package for platform-independent schemas and error mappings.

## Adding or changing a service

Keep request-scoped clients inside the request; do not cache user-bound Supabase clients globally. Confirm the user server-side, handle Supabase errors explicitly, and rely on RLS for ownership. If a helper is platform-neutral, move it to `@fin/shared`; if it is a mutation specific to one screen, keep it next to that route.

For new UI copy, use `useTranslations().tKey("transactions.newTransaction")` or `<T id="transactions.newTransaction" />`. IDs are English dotted paths and are checked against every language catalog. Phrase-based `t(...)` remains only for existing screens during gradual migration.
