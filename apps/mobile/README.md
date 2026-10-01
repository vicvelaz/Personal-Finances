# Mobile app

Universal Expo Router client for fin. The workspace package is `@fin/mobile`; it targets iOS, Android and web. Follow the root README first to install dependencies and start local Supabase.

## Start

Create `apps/mobile/.env` from `apps/mobile/.env.example`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the local values shown by `pnpm supabase:status`. Then, from the repository root:

```sh
pnpm mobile
```

Use the Expo terminal shortcuts to open the app, or use one of the package scripts directly:

```sh
pnpm --filter @fin/mobile web
pnpm --filter @fin/mobile android
pnpm --filter @fin/mobile ios
```

The Expo development server normally listens on port `8081`. Android requires an emulator/device; iOS Simulator requires macOS and Xcode. A physical device must share the computer's network: use the computer's LAN IP in `EXPO_PUBLIC_SUPABASE_URL` instead of `127.0.0.1`. `EXPO_PUBLIC_WEB_URL` is used for web hand-offs such as OAuth.

## Structure

- `src/app/`: file-based route tree and navigation layouts. See [route groups and screens](src/app/README.md).
- `src/lib/`: Supabase session/storage, domain query/mutation hooks and device integrations. See [mobile services](src/lib/README.md).
- `src/components/`: reusable UI and app navigation.
- `src/constants/` and `src/hooks/`: theme tokens and platform hooks.
- `assets/`: app icons, splash assets and tab icons.

The root layout wires React Query, theme and `SessionProvider`, then protects `(app)`, `(auth)` and MFA routes. Feature screens call platform services in `src/lib/`; shared validation and money/date helpers come from `@fin/shared`.

## Checks

```sh
pnpm --filter @fin/mobile lint
pnpm --filter @fin/mobile typecheck
```

There is no mobile unit-test script today; shared business rules are covered by tests in `@fin/shared`. Push/local notification APIs require a native runtime to validate fully; Expo web intentionally skips local reminder scheduling.

## Configuration and security

Only public values belong in `apps/mobile/.env`: variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle. Never put service-role keys, database credentials or cron secrets here. Authentication uses Supabase Auth with the SecureStore adapter on native platforms; row access remains constrained by Postgres RLS.
