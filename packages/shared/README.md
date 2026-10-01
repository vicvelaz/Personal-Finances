# Shared domain package

`@fin/shared` contains TypeScript behavior that must agree across web and mobile: Zod input schemas, domain transformations, date/money formatting, validation/error helpers and the Spanish/English message catalog. It has no database connection or UI/runtime ownership.

## Design boundary

Use this package when logic is deterministic and platform-independent. Keep Supabase calls in app services/actions, React state in components, and database-enforced invariants in SQL. A shared schema improves client feedback but does not replace server-side checks, authorization or database constraints.

The package is exported through `src/index.ts`; add public APIs there and test non-trivial behavior in the neighboring `*.test.ts` file. Keep helpers explicit about dates, locale, currency and minor-unit inputs.

## Localization

`src/i18n.ts` defines stable, dotted English keys in a small domain hierarchy (`auth.signInTitle`, `transactions.splitAcrossCategories`). English defines the canonical key shape; each catalog is checked against it at compile time. To add a language, add its code to `SUPPORTED_LANGUAGES` and provide a full matching object in `catalogs`; TypeScript then requires every English key in that object. Add supported regional formats separately in `src/profile.ts` when the profile should offer them.

Use `translateKey(locale, "auth.signInTitle")` for new programmatic messages. Web's `<T id="auth.signInTitle" />` and mobile's `<ThemedText translationKey="auth.signInTitle" />` provide typed UI forms. `translate()` and phrase-based component props remain as a compatibility bridge for existing screens; new code should prefer IDs.

## Commands

```sh
pnpm --filter @fin/shared typecheck
pnpm --filter @fin/shared test
```

Root `pnpm test` and `pnpm typecheck` include the package through Turbo.
