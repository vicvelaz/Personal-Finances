import { z } from "zod";
import { isValidIsoDate } from "./dates";
import { parseMoneyInput } from "./money-input";
import { TRANSACTION_MESSAGES, transactionErrorMessage } from "./transactions";
import type { TranslationKey } from "./i18n";

export const RECURRENCES = ["none", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<Recurrence, TranslationKey> = {
  none: "common.once",
  daily: "common.daily",
  weekly: "common.weekly",
  biweekly: "common.everyTwoWeeks",
  monthly: "dashboard.monthly",
  quarterly: "common.quarterly",
  yearly: "common.yearly",
};

const positiveMoney = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const minor = parseMoneyInput(v);
    if (minor === null || minor <= 0) {
      ctx.addIssue({ code: "custom", message: "Introduce un importe mayor que 0 (máximo 2 decimales)" });
      return z.NEVER;
    }
    return minor;
  });

export const scheduledSchema = z
  .object({
    kind: z.enum(["expense", "income"], { error: "Tipo no válido" }),
    accountId: z.uuid({ error: "Selecciona una cuenta" }),
    categoryId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.uuid().nullable()),
    amount: positiveMoney,
    description: z
      .string()
      .trim()
      .min(1, { error: "La descripción es obligatoria" })
      .max(120, { error: "La descripción no puede superar 120 caracteres" }),
    recurrence: z.enum(RECURRENCES, { error: "Periodicidad no válida" }),
    startsOn: z.string().refine(isValidIsoDate, { error: "Fecha no válida" }),
    endsOn: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .refine((v) => v === null || isValidIsoDate(v), { error: "Fecha no válida" }),
    isEstimated: z.boolean(),
    autoPost: z.boolean().default(false),
    reminderDaysBefore: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) <= 30), {
        error: "Introduce un número de días entre 0 y 30",
      })
      .transform((v) => (v === "" ? null : Number(v))),
  })
  .refine((v) => v.endsOn === null || v.endsOn >= v.startsOn, {
    path: ["endsOn"],
    error: "La fecha de fin no puede ser anterior a la de inicio",
  })
  .refine((v) => !(v.autoPost && v.isEstimated), {
    path: ["autoPost"],
    error: "Los importes estimados no se pueden registrar automáticamente",
  });

export type ScheduledValues = z.output<typeof scheduledSchema>;

/** Optional amount entered when posting an estimated schedule; empty means "use the planned amount". */
export const postAmountSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const minor = parseMoneyInput(v);
    if (minor === null || minor <= 0) {
      ctx.addIssue({ code: "custom", message: "Introduce un importe mayor que 0" });
      return z.NEVER;
    }
    return minor;
  });

export function isDue(nextRunOn: string, today: string): boolean {
  return nextRunOn <= today;
}

/** ISO date on which to remind about a schedule due on nextRunOn. */
export function reminderDate(nextRunOn: string, daysBefore: number): string {
  const d = new Date(`${nextRunOn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  return d.toISOString().slice(0, 10);
}

export const SCHEDULED_MESSAGES = {
  invalidKind: "Solo se pueden programar gastos e ingresos",
  invalidDates: "La fecha de fin no puede ser anterior a la de inicio",
  notFound: "El movimiento programado no existe",
  inactive: "El movimiento programado está inactivo",
} as const;

export function scheduledErrorMessage(message: string | undefined): { field?: string; message: string } {
  switch (message) {
    case "scheduled_invalid_kind":
      return { field: "kind", message: SCHEDULED_MESSAGES.invalidKind };
    case "scheduled_invalid_dates":
      return { field: "endsOn", message: SCHEDULED_MESSAGES.invalidDates };
    case "scheduled_not_found":
      return { message: SCHEDULED_MESSAGES.notFound };
    case "scheduled_inactive":
      return { message: SCHEDULED_MESSAGES.inactive };
    default: {
      const mapped = transactionErrorMessage(message);
      return mapped.message === TRANSACTION_MESSAGES.unexpected
        ? { message: "No se pudo guardar el movimiento programado. Inténtalo de nuevo" }
        : mapped;
    }
  }
}
