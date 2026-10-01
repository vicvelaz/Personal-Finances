import { z } from "zod";
import { isValidIsoDate } from "./dates";
import type { Minor } from "./money";
import { parseMoneyInput } from "./money-input";
import { SUPPORTED_CURRENCIES } from "./profile";
import type { TranslationKey } from "./i18n";

export const GOAL_STATUSES = ["active", "achieved", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS_LABELS: Record<GoalStatus, TranslationKey> = {
  active: "goals.activeStatus",
  achieved: "goals.achievedStatus",
  archived: "common.archived",
};

const positiveMoney = (message: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const minor = parseMoneyInput(v);
      if (minor === null || minor <= 0) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return minor;
    });

export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "El nombre es obligatorio" })
    .max(60, { error: "El nombre no puede superar 60 caracteres" }),
  targetAmount: positiveMoney("Introduce un objetivo mayor que 0 (máximo 2 decimales)"),
  currency: z.enum(SUPPORTED_CURRENCIES, { error: "Moneda no soportada" }),
  targetDate: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || isValidIsoDate(v), { error: "Fecha no válida" }),
  accountId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
});

export type GoalValues = z.output<typeof goalSchema>;

export const goalAdjustSchema = z.object({
  direction: z.enum(["deposit", "withdraw"]),
  amount: positiveMoney("Introduce un importe mayor que 0"),
  /** Optional account to move the money from (deposit) or to (withdraw). */
  accountId: z
    .string()
    .trim()
    .default("")
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid({ error: "Cuenta no válida" }).nullable()),
});

export const GOAL_MESSAGES = {
  invalidTarget: "Introduce un objetivo mayor que 0",
  negative: "No puedes retirar más de lo ahorrado",
  invalidAccount: "La cuenta debe ser tuya y de la misma moneda que la meta",
  notFound: "La meta no existe",
  noAccount: "Vincula una cuenta a la meta para mover dinero",
  sameAccount: "Elige una cuenta distinta de la de la meta",
  currency: "La cuenta debe tener la misma moneda que la meta",
  unexpected: "No se pudo guardar la meta. Inténtalo de nuevo",
} as const;

export function goalErrorMessage(message: string | undefined): { field?: string; message: string } {
  switch (message) {
    case "goal_invalid_target":
      return { field: "targetAmount", message: GOAL_MESSAGES.invalidTarget };
    case "goal_negative_amount":
      return { field: "amount", message: GOAL_MESSAGES.negative };
    case "goal_invalid_account":
      return { field: "accountId", message: GOAL_MESSAGES.invalidAccount };
    case "goal_not_found":
      return { message: GOAL_MESSAGES.notFound };
    case "goal_no_account":
      return { field: "accountId", message: GOAL_MESSAGES.noAccount };
    case "transfer_same_account":
      return { field: "accountId", message: GOAL_MESSAGES.sameAccount };
    case "transfer_to_amount_required":
      return { field: "accountId", message: GOAL_MESSAGES.currency };
    default:
      return { message: GOAL_MESSAGES.unexpected };
  }
}

/** Progress of a goal; monthlyNeeded is null without a future target date. */
export function goalProgress(input: {
  target: Minor;
  current: Minor;
  targetDate: string | null;
  today: string;
}): { percent: number; remaining: Minor; monthsLeft: number | null; monthlyNeeded: Minor | null } {
  const percent = input.target > 0 ? Math.round((input.current / input.target) * 1000) / 10 : 0;
  const remaining = Math.max(0, input.target - input.current);
  let monthsLeft: number | null = null;
  if (input.targetDate && input.targetDate > input.today) {
    const [ty, tm] = input.targetDate.split("-").map(Number) as [number, number];
    const [y, m] = input.today.split("-").map(Number) as [number, number];
    monthsLeft = Math.max(1, (ty - y) * 12 + (tm - m));
  }
  const monthlyNeeded = monthsLeft === null ? null : Math.ceil(remaining / monthsLeft);
  return { percent, remaining, monthsLeft, monthlyNeeded };
}
