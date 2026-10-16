import { z } from "zod";
import type { Minor } from "./money";
import { parseMoneyInput } from "./money-input";
import { SUPPORTED_CURRENCIES } from "./profile";
import type { TranslationKey } from "./i18n";

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "loan",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, TranslationKey> = {
  checking: "accounts.checkingAccount",
  savings: "accounts.savings",
  credit_card: "accounts.creditCard",
  cash: "accounts.cash",
  investment: "accounts.investment",
  loan: "accounts.loan",
};

const moneyInputSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return 0;
    const minor = parseMoneyInput(v);
    if (minor === null) {
      ctx.addIssue({ code: "custom", message: "Introduce un importe válido (máximo 2 decimales)" });
      return z.NEVER;
    }
    return minor;
  });

const accountFields = {
  name: z
    .string()
    .trim()
    .min(1, { error: "El nombre es obligatorio" })
    .max(60, { error: "El nombre no puede superar 60 caracteres" }),
  type: z.enum(ACCOUNT_TYPES, { error: "Tipo de cuenta no válido" }),
  openingBalance: moneyInputSchema,
};

export const accountCreateSchema = z.object({
  ...accountFields,
  currency: z.enum(SUPPORTED_CURRENCIES, { error: "Moneda no soportada" }),
});

/** Currency is intentionally absent: it cannot change after creation. */
export const accountUpdateSchema = z.object(accountFields);

export type AccountCreateInput = z.input<typeof accountCreateSchema>;
export type AccountCreate = z.output<typeof accountCreateSchema>;
export type AccountUpdate = z.output<typeof accountUpdateSchema>;

export const ACCOUNT_MESSAGES = {
  hasTransactions: "La cuenta tiene movimientos y no se puede borrar. Archívala en su lugar",
  notFound: "La cuenta no existe",
  unexpected: "No se pudo guardar la cuenta. Inténtalo de nuevo",
} as const;

export function accountReconciliationErrorKey(message?: string): TranslationKey {
  switch (message) {
    case "reconciliation_invalid_account":
      return "accounts.accountNotFound";
    case "transaction_account_archived":
      return "accounts.cannotReconcileArchived";
    case "mfa_required":
      return "auth.mfaRequired";
    default:
      return "accounts.reconciliationFailed";
  }
}

/** Sums balances of non-archived accounts per currency; never mixes currencies. */
export function totalsByCurrency(
  accounts: readonly { currency: string; balance: Minor; isArchived: boolean }[],
): { currency: string; total: Minor }[] {
  const totals = new Map<string, Minor>();
  for (const a of accounts) {
    if (a.isArchived) continue;
    totals.set(a.currency, (totals.get(a.currency) ?? 0) + a.balance);
  }
  return [...totals].map(([currency, total]) => ({ currency, total })).sort((x, y) => x.currency.localeCompare(y.currency));
}
