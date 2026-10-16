# Domain module index

Each module in this folder is platform-neutral. Most have a neighboring Vitest suite. `index.ts` is the public API consumed by the web and mobile apps.

| Module                       | Purpose                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `accounts.ts`                | Account input schemas and account-related rules                                              |
| `auth.ts`, `redirect.ts`     | Auth input/redirect validation helpers                                                       |
| `profile.ts`                 | Profile schemas and preferences                                                              |
| `i18n.ts`                    | English-keyed, domain-grouped catalogs; regional locale resolution and message interpolation |
| `categories.ts`              | Category schemas and rules                                                                   |
| `transactions.ts`            | Transaction schemas, signed amount behavior and error mapping                                |
| `splits.ts`                  | Split validation, including matching the parent amount                                       |
| `budgets.ts`, `goals.ts`     | Budget and savings-goal domain validation/calculations                                       |
| `scheduled.ts`, `dates.ts`   | Recurrence dates, manual date conversion and scheduled reminder date calculations           |
| `rates.ts`, `reports.ts`     | Exchange-rate conversion and report calculations                                             |
| `money.ts`, `money-input.ts` | Integer minor-unit and strict/locale-aware user-input parsing and formatting helpers        |
| `csv-import.ts`              | CSV column mapping, row validation and duplicate-related import helpers                      |
| `data-rights.ts`             | Export/deletion confirmation validation                                                      |

Catalog IDs use dotted domain paths such as `auth.signInTitle` and `transactions.splitAcrossCategories`. English defines the canonical key shape; adding a language requires a matching catalog object and a `SUPPORTED_LANGUAGES` entry, enforced by TypeScript. Regional formatting choices remain in `profile.ts`.

Use `translateKey(locale, "auth.signInTitle")` for new shared messages. `translate()` still resolves the original Spanish phrases so existing forms, validators and screens do not need a risky all-at-once rewrite; prefer stable IDs in new code.

Prefer small pure functions and schemas that take values explicitly. Keep locale and currency context explicit; use integer minor units for monetary arithmetic. Add a nearby test for edge cases whenever a rule changes, then run `pnpm --filter @fin/shared test`.

For positive amount fields that do not permit grouping or signs, use `isValidPositiveMoneyDraft()` to reject invalid edits/pastes and `parsePositiveMoneyInput()` to convert a completed value to positive integer minor units; an empty or invalid value returns `null`. Keep `parseMoneyInput()` for existing fields whose domain allows signed or grouped values. Use `parseManualDate()` and `formatManualDate()` to convert between `DD/MM/YYYY` and ISO calendar dates without timezone conversion; both return `null` for invalid input.
