import { z } from "zod";
import type { Minor } from "./money";
import { parseMoneyInput } from "./money-input";

export const budgetSchema = z.object({
  categoryId: z.uuid({ error: "Selecciona una categoría" }),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Mes no válido" }),
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
});

export type BudgetValues = z.output<typeof budgetSchema>;

export type BudgetLevel = "ok" | "warning" | "over";

/** Remaining amount, consumed percentage (rounded) and alert level of a budget. */
export function budgetStatus(amount: Minor, spent: Minor): { remaining: Minor; percent: number; level: BudgetLevel } {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const level: BudgetLevel = spent > amount ? "over" : percent >= 80 ? "warning" : "ok";
  return { remaining: amount - spent, percent, level };
}

export const BUDGET_MESSAGES = {
  duplicate: "Ya hay un presupuesto para esa categoría en este mes",
  invalidCategory: "Elige una categoría de gastos",
  invalidAmount: "Introduce un importe mayor que 0",
  unexpected: "No se pudo guardar el presupuesto. Inténtalo de nuevo",
  baseCurrencyOnly: "Solo se tienen en cuenta los gastos en tu moneda base",
} as const;

export function budgetErrorMessage(
  code: string | undefined,
  message: string | undefined,
): { field?: "categoryId" | "amount"; message: string } {
  if (code === "23505") return { field: "categoryId", message: BUDGET_MESSAGES.duplicate };
  if (message === "budget_invalid_category") return { field: "categoryId", message: BUDGET_MESSAGES.invalidCategory };
  if (message === "budget_invalid_amount") return { field: "amount", message: BUDGET_MESSAGES.invalidAmount };
  return { message: BUDGET_MESSAGES.unexpected };
}
