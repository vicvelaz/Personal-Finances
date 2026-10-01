# Mobile services

`src/lib` contains platform integrations and feature-level data hooks. Screens should compose these services rather than owning Supabase session persistence or repeating domain validation.

## Session and backend

- `supabase.ts`: configures the Supabase client from `EXPO_PUBLIC_*`, enables token refresh and installs `secure-storage.ts` for native persistence. On native, token auto-refresh runs only while the app is active.
- `secure-storage.ts`: adapts Expo SecureStore to the storage interface expected by Supabase Auth; web uses its supported storage fallback.
- `session.tsx`: provides the session to the route tree and derives whether a verified MFA user still needs an AAL2 challenge.
- `i18n.tsx`: loads the signed-in profile locale (or device language before sign-in) and exposes it to shared text/form components.
- `confirm.ts` and `oauth.ts`: platform-specific email/OAuth hand-off helpers.

All client configuration is public. Never add service-role or database credentials to Expo environment variables. Ordinary table access uses the user session and depends on database RLS.

## Feature data modules

| Module            | Responsibility                                                       |
| ----------------- | -------------------------------------------------------------------- |
| `accounts.ts`     | Account list, detail and mutations                                   |
| `categories.ts`   | Category reads and mutations                                         |
| `transactions.ts` | Paged ledger queries, detail and create/update/delete mutations      |
| `scheduled.ts`    | Recurring transaction data and mutations                             |
| `goals.ts`        | Savings-goal reads, edits and linked movements                       |
| `profile.ts`      | Profile query and update                                             |
| `reminders.ts`    | Local notification permissions and reminder schedule synchronization |

Feature data hooks use TanStack Query. After changing a mutation, confirm every affected query is invalidated, particularly transaction/account/goal relationships. Keep monetary rules and parsers in `@fin/shared`.

Visible messages live in the English-keyed, domain-grouped catalogs in `@fin/shared/src/i18n.ts`. For new copy, use `ThemedText translationKey="transactions.newTransaction"`, `Button titleKey="common.save"`, `TextField labelKey="fields.amount"`, or `translateKey` from the shared package. Phrase-based translation remains for existing screens during migration. Do not translate names, descriptions or other user-owned values.

## Device behavior

Local reminders are native-only, ask for notification permission when needed, and cap pending notifications below iOS's limit. They mirror active scheduled items and do not post transactions or replace the database automation. OAuth and email confirmation depend on redirect configuration in `app.json` and Supabase Auth; test on the actual target runtime as well as Expo web.
