# Mobile routes and flows

Expo Router turns files under `src/app` into routes. Parentheses create navigation groups without adding a URL/route segment. `_layout.tsx` files own providers, guards and navigators; keep feature services and reusable UI outside this route directory.

## Authentication and guards

- Root `_layout.tsx` installs the theme, React Query client and `SessionProvider`.
- `(auth)/` contains login, signup and password recovery for signed-out users.
- `mfa.tsx` is protected for sessions that have a verified MFA factor but have not reached the required AAL2 level.
- `(app)/` is protected for fully authenticated sessions. The app-group layout installs navigation tabs and starts local reminder synchronization.

The guard decision is centralized in the root navigator. When adding a screen that changes auth state or MFA, update and test this guard flow rather than adding a separate screen-level redirect.

## Screen map

| Route                                                   | Purpose                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `(app)/index.tsx`                                       | Dashboard and balances                                           |
| `(app)/transactions/`                                   | Transaction list, create/edit, transfers and split editing       |
| `(app)/accounts/`                                       | Account list, create/edit and details                            |
| `(app)/budgets.tsx`                                     | Budget progress and overview                                     |
| `(app)/profile/`                                        | Profile, categories, goals, scheduled items and account controls |
| `(auth)/login.tsx`, `signup.tsx`, `forgot-password.tsx` | Authentication and recovery                                      |
| `mfa.tsx`                                               | Second-factor challenge                                          |

Nested feature screens are kept under their owning route folder; service/query logic lives under `src/lib`. See the [mobile service guide](../lib/README.md).

## Screen data flow

Route components call hooks or actions from `src/lib`, which query Supabase using the current session. React Query keys include user/context where needed; successful mutations invalidate affected lists/details. Reuse `@fin/shared` schemas/helpers so web and mobile agree on accepted inputs, date handling and signed money behavior.
