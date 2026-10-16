import { z } from "zod";
import { isValidIsoDate } from "./dates";
import type { Minor } from "./money";
import { parseMoneyInput } from "./money-input";
import type { TranslationKey } from "./i18n";

export const TRANSACTION_KINDS = ["expense", "income", "transfer"] as const;
export const TRANSACTION_FILTER_KINDS = [...TRANSACTION_KINDS, "adjustment"] as const;
export type TransactionKind = (typeof TRANSACTION_FILTER_KINDS)[number];

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, TranslationKey> = {
  adjustment: "transactions.balanceAdjustment",
  expense: "transactions.expense",
  income: "transactions.income",
  transfer: "transactions.transfer",
};

export const TRANSACTION_PAGE_SIZE = 50;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} no puede superar ${max} caracteres` })
    .transform((v) => (v === "" ? null : v));

const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid().nullable());

/** Form input for any kind. Amount is a positive magnitude; the kind decides the sign. */
export const transactionSchema = z
  .object({
    kind: z.enum(TRANSACTION_KINDS, { error: "Tipo no válido" }),
    accountId: z.uuid({ error: "Selecciona una cuenta" }),
    toAccountId: optionalUuid,
    categoryId: optionalUuid,
    amount: z
      .string()
      .trim()
      .transform((v, ctx) => {
        const minor = parseMoneyInput(v);
        if (minor === null || minor <= 0) {
          ctx.addIssue({ code: "custom", message: "Introduce un importe mayor que 0 (máximo 2 decimales)" });
          return z.NEVER;
        }
        return minor;
      }),
    occurredOn: z.string().refine(isValidIsoDate, { error: "Fecha no válida" }),
    description: optionalText(120, "La descripción"),
    notes: optionalText(500, "Las notas"),
    /** Amount credited to the destination of a transfer between different currencies. */
    toAmount: z
      .string()
      .trim()
      .default("")
      .transform((v, ctx) => {
        if (v === "") return null;
        const minor = parseMoneyInput(v);
        if (minor === null || minor <= 0) {
          ctx.addIssue({ code: "custom", message: "Introduce un importe mayor que 0 (máximo 2 decimales)" });
          return z.NEVER;
        }
        return minor;
      }),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "transfer") return;
    if (!v.toAccountId) {
      ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Selecciona la cuenta destino" });
    } else if (v.toAccountId === v.accountId) {
      ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "La cuenta destino debe ser distinta" });
    }
  })
  .transform((v) => (v.kind === "transfer" ? { ...v, categoryId: null } : { ...v, toAccountId: null, toAmount: null }));

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;

/** Stored amount: negative for expenses, positive for income. Transfers are signed per leg by the database. */
export function signedAmount(kind: "expense" | "income", magnitude: Minor): Minor {
  return kind === "expense" ? -Math.abs(magnitude) : Math.abs(magnitude);
}

export const TRANSACTION_MESSAGES = {
  invalidAccount: "La cuenta no existe",
  archived: "La cuenta está archivada. Desarchívala para añadir movimientos",
  invalidCategory: "La categoría no es válida para este tipo de movimiento",
  invalidAmount: "Importe no válido",
  sameAccount: "La cuenta destino debe ser distinta",
  currencyMismatch: "Las cuentas de una transferencia deben tener la misma moneda",
  toAmountRequired: "Indica el importe recibido en la moneda destino",
  notFound: "El movimiento no existe",
  splitSumMismatch: "Las partes deben sumar el total del movimiento",
  splitTooFew: "Divide el movimiento en al menos 2 partes",
  splitTransfer: "Las transferencias no se pueden dividir",
  splitAdjustment: "Los ajustes de saldo no se pueden dividir",
  adjustmentReadOnly: "Los ajustes de saldo no se pueden editar ni borrar",
  unexpected: "No se pudo guardar el movimiento. Inténtalo de nuevo",
} as const;

type TransactionField = "accountId" | "toAccountId" | "categoryId" | "amount" | "toAmount";

/** Maps a database error message raised by the transaction rules to a field and user-facing message. */
export function transactionErrorMessage(message: string | undefined): { field?: TransactionField; message: string } {
  switch (message) {
    case "transaction_invalid_account":
      return { field: "accountId", message: TRANSACTION_MESSAGES.invalidAccount };
    case "transaction_account_archived":
      return { field: "accountId", message: TRANSACTION_MESSAGES.archived };
    case "transaction_invalid_category":
      return { field: "categoryId", message: TRANSACTION_MESSAGES.invalidCategory };
    case "transaction_invalid_amount":
      return { field: "amount", message: TRANSACTION_MESSAGES.invalidAmount };
    case "transfer_same_account":
      return { field: "toAccountId", message: TRANSACTION_MESSAGES.sameAccount };
    case "transfer_currency_mismatch":
      return { field: "toAccountId", message: TRANSACTION_MESSAGES.currencyMismatch };
    case "transfer_to_amount_required":
      return { field: "toAmount", message: TRANSACTION_MESSAGES.toAmountRequired };
    case "transaction_not_found":
      return { message: TRANSACTION_MESSAGES.notFound };
    case "split_sum_mismatch":
      return { field: "amount", message: TRANSACTION_MESSAGES.splitSumMismatch };
    case "split_too_few":
      return { message: TRANSACTION_MESSAGES.splitTooFew };
    case "split_transfer":
      return { message: TRANSACTION_MESSAGES.splitTransfer };
    case "split_adjustment":
      return { message: TRANSACTION_MESSAGES.splitAdjustment };
    case "adjustment_reconciliation_only":
      return { message: TRANSACTION_MESSAGES.adjustmentReadOnly };
    default:
      return { message: TRANSACTION_MESSAGES.unexpected };
  }
}

/** Escapes LIKE wildcards so user text is matched literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
