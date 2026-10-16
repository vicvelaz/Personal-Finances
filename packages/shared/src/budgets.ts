import { z } from "zod";
import { isValidIsoDate, monthRange } from "./dates";
import { translateKey } from "./i18n";
import type { Minor } from "./money";
import { formatMoney } from "./money";
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

export const BUDGET_PERIODS = ["once", "monthly", "annual"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

/** Creation input: schedule plus optional inclusive end month (recurring periods only). */
export const budgetCreateSchema = budgetSchema
  .extend({
    period: z.enum(BUDGET_PERIODS, { error: "Modalidad no válida" }).default("once"),
    endMonth: z
      .string()
      .trim()
      .default("")
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Mes no válido" }).nullable()),
  })
  .superRefine((v, ctx) => {
    if (v.endMonth === null) return;
    if (v.period === "once") {
      ctx.addIssue({ code: "custom", path: ["endMonth"], message: "Un periodo único no tiene fecha final" });
    } else if (v.endMonth < v.month) {
      ctx.addIssue({ code: "custom", path: ["endMonth"], message: "La fecha final no puede ser anterior a la inicial" });
    }
  });

export type BudgetCreateValues = z.output<typeof budgetCreateSchema>;

export type BudgetPeriodDefinition = {
  period: BudgetPeriod;
  startsIn: string;
  endsIn?: string | null;
};

export type BudgetPeriodRange = { from: string; to: string };

/** The natural-calendar range covered by a budget occurrence for the given month. */
export function budgetPeriodRange(period: BudgetPeriod, month: string): BudgetPeriodRange | null {
  const monthBounds = monthRange(month);
  if (!monthBounds) return null;
  if (period !== "annual") return monthBounds;

  const year = month.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function monthOrdinal(month: string): number | null {
  if (!monthRange(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  return year === undefined || monthNumber === undefined ? null : year * 12 + monthNumber - 1;
}

function activeMonthRange(definition: BudgetPeriodDefinition): { first: number; last: number } | null {
  const start = monthOrdinal(definition.startsIn);
  const end = definition.endsIn == null ? start : monthOrdinal(definition.endsIn);
  if (start === null || end === null || end < start) return null;
  if (!BUDGET_PERIODS.includes(definition.period)) return null;
  if (definition.period === "once" && end !== start) return null;

  const first = definition.period === "annual" ? Math.floor(start / 12) * 12 : start;
  const last = definition.period === "annual" ? Math.floor(end / 12) * 12 + 11 : end;
  return { first, last };
}

/** Returns null when either definition is malformed; otherwise compares active calendar periods. */
export function budgetPeriodsOverlap(first: BudgetPeriodDefinition, second: BudgetPeriodDefinition): boolean | null {
  const a = activeMonthRange(first);
  const b = activeMonthRange(second);
  if (!a || !b) return null;
  return a.first <= b.last && b.first <= a.last;
}

/** Rounded monthly reference for an annual budget, retaining integer minor units. */
export function annualBudgetMonthlyEquivalent(annualLimit: Minor): Minor | null {
  if (!Number.isSafeInteger(annualLimit) || annualLimit <= 0) return null;
  return Number((BigInt(annualLimit) + BigInt(6)) / BigInt(12));
}

/** Monthly budget expected from January through the given day, including a prorated current month. */
export function monthlyBudgetExpectedToDate(monthlyLimit: Minor, today: string): Minor | null {
  if (!Number.isSafeInteger(monthlyLimit) || monthlyLimit <= 0 || !isValidIsoDate(today)) return null;
  if (!Number.isSafeInteger(monthlyLimit * 12)) return null;
  const monthNumber = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  const elapsedMonths = monthNumber - 1;
  const daysInMonth = Number(monthRange(today.slice(0, 7))!.to.slice(-2));
  const numerator = BigInt(monthlyLimit) * BigInt(day);
  const proratedMonth = Number(
    (numerator * BigInt(2) + BigInt(daysInMonth)) / (BigInt(2) * BigInt(daysInMonth)),
  );
  return elapsedMonths * monthlyLimit + proratedMonth;
}

export type AnnualBudgetPlan =
  | { success: true; monthlyLimits: Record<string, Minor>; annualLimit: Minor; plannedTotal: Minor }
  | { success: false; uncovered: Minor };

/**
 * Raises a future month's limit by reducing complete future months before it,
 * distributing each minor unit as evenly as possible without changing past months.
 */
export function planAnnualMonthlyBudget(input: {
  monthlyLimit: Minor;
  targetMonth: string;
  targetLimit: Minor;
  currentMonth: string;
}): AnnualBudgetPlan | null {
  const { monthlyLimit, targetMonth, targetLimit, currentMonth } = input;
  if (
    !Number.isSafeInteger(monthlyLimit) ||
    monthlyLimit <= 0 ||
    !Number.isSafeInteger(targetLimit) ||
    targetLimit <= 0
  ) {
    return null;
  }
  const target = monthOrdinal(targetMonth);
  const current = monthOrdinal(currentMonth);
  if (target === null || current === null || targetMonth.slice(0, 4) !== currentMonth.slice(0, 4) || target <= current) {
    return null;
  }

  const annualLimit = monthlyLimit * 12;
  if (!Number.isSafeInteger(annualLimit)) return null;
  const monthlyLimits: Record<string, Minor> = {};
  for (let month = 1; month <= 12; month++) {
    monthlyLimits[`${targetMonth.slice(0, 4)}-${String(month).padStart(2, "0")}`] = monthlyLimit;
  }

  const increase = Math.max(0, targetLimit - monthlyLimit);
  const compensatingMonths = target - current - 1;
  const capacity = compensatingMonths * monthlyLimit;
  if (increase > capacity) return { success: false, uncovered: increase - capacity };

  monthlyLimits[targetMonth] = targetLimit;
  if (increase > 0 && compensatingMonths > 0) {
    const evenReduction = Math.floor(increase / compensatingMonths);
    let extraMinorUnits = increase % compensatingMonths;
    for (let month = current + 1; month < target; month++) {
      const key = `${targetMonth.slice(0, 4)}-${String(month % 12 + 1).padStart(2, "0")}`;
      const reduction = evenReduction + (extraMinorUnits-- > 0 ? 1 : 0);
      monthlyLimits[key] = monthlyLimit - reduction;
    }
  }

  const plannedTotal = Object.values(monthlyLimits).reduce((sum, amount) => sum + amount, 0);
  return { success: true, monthlyLimits, annualLimit, plannedTotal };
}

export type BudgetInsights = {
  annualLimit: Minor;
  monthlyEquivalent: Minor;
  annualEstimate: Minor | null;
  yearSpent: Minor;
  expectedToDate: Minor | null;
  aboveExpected: Minor;
  maxMonthlyRemaining: Minor;
};

/**
 * Annual/monthly equivalences and the pace needed to finish the year within the annual limit.
 * Returns null for one-off budgets or invalid input. Remaining months include the current one,
 * whose spending is already part of `yearSpent`.
 */
export function budgetInsights(input: {
  period: BudgetPeriod;
  baseAmount: Minor;
  yearSpent: Minor;
  today: string;
}): BudgetInsights | null {
  const { period, baseAmount, yearSpent, today } = input;
  if (period === "once" || !isValidIsoDate(today) || !Number.isSafeInteger(yearSpent)) return null;
  const monthlyEquivalent = period === "annual" ? annualBudgetMonthlyEquivalent(baseAmount) : baseAmount;
  if (monthlyEquivalent === null || !Number.isSafeInteger(baseAmount) || baseAmount <= 0) return null;

  const annualLimit = period === "annual" ? baseAmount : baseAmount * 12;
  const expectedToDate = period === "monthly" ? monthlyBudgetExpectedToDate(baseAmount, today) : null;
  const remainingMonths = 12 - Number(today.slice(5, 7)) + 1;
  return {
    annualLimit,
    monthlyEquivalent,
    annualEstimate: period === "monthly" ? annualLimit : null,
    yearSpent,
    expectedToDate,
    aboveExpected: expectedToDate === null ? 0 : Math.max(0, yearSpent - expectedToDate),
    maxMonthlyRemaining: Math.max(0, Math.floor((annualLimit - yearSpent) / remainingMonths)),
  };
}

export type BudgetLevel = "ok" | "warning" | "over";

/** Localized summary lines for equivalences and projections, shared by web and mobile. */
export function budgetInsightLines(
  locale: string,
  period: BudgetPeriod,
  insights: BudgetInsights,
  currency: string,
): string[] {
  const money = (v: Minor) => formatMoney(v, currency, locale);
  const lines: string[] = [];
  if (period === "annual") {
    lines.push(translateKey(locale, "budgets.annualLimit", { amount: money(insights.annualLimit) }));
    lines.push(translateKey(locale, "budgets.monthlyEquivalent", { amount: money(insights.monthlyEquivalent) }));
  } else {
    lines.push(translateKey(locale, "budgets.annualEstimate", { amount: money(insights.annualEstimate ?? insights.annualLimit) }));
    lines.push(translateKey(locale, "budgets.spentYearToDate", { amount: money(insights.yearSpent) }));
    lines.push(translateKey(locale, "budgets.expectedToDate", { amount: money(insights.expectedToDate ?? 0) }));
    if (insights.aboveExpected > 0) {
      lines.push(translateKey(locale, "budgets.overAnnualPace", { amount: money(insights.aboveExpected) }));
    }
  }
  lines.push(translateKey(locale, "budgets.maxMonthlyRemaining", { amount: money(insights.maxMonthlyRemaining) }));
  return lines;
}

export type BudgetMonthPlanResult =
  | { ok: true; rows: { month: string; amount: Minor }[] }
  | { ok: false; reason: "invalid_month" }
  | { ok: false; reason: "invalid_amount" }
  | { ok: false; reason: "exceeds_limit"; uncovered: Minor };

/** Month limits to persist when raising a future month: only months after today up to the target. */
export function prepareBudgetMonthPlan(input: {
  monthlyLimit: Minor;
  currentMonth: string;
  targetMonth: string;
  targetLimit: Minor;
}): BudgetMonthPlanResult {
  const plan = planAnnualMonthlyBudget(input);
  if (!plan) return { ok: false, reason: "invalid_month" };
  if (!plan.success) return { ok: false, reason: "exceeds_limit", uncovered: plan.uncovered };
  const rows = Object.entries(plan.monthlyLimits)
    .filter(([month]) => month > input.currentMonth && month <= input.targetMonth)
    .map(([month, amount]) => ({ month, amount }));
  if (rows.some((row) => row.amount <= 0)) return { ok: false, reason: "invalid_amount" };
  return { ok: true, rows };
}

/** Remaining amount, consumed percentage (rounded) and alert level of a budget. */
export function budgetStatus(amount: Minor, spent: Minor): { remaining: Minor; percent: number; level: BudgetLevel } {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const level: BudgetLevel = spent > amount ? "over" : percent >= 80 ? "warning" : "ok";
  return { remaining: amount - spent, percent, level };
}

export const BUDGET_MESSAGES = {
  duplicate: "Ya hay un presupuesto para esa categoría en este mes",
  overlap: "Ya hay un presupuesto para esa categoría que se solapa con este periodo",
  invalidDates: "Las fechas de vigencia no son válidas",
  invalidCategory: "Elige una categoría de gastos",
  invalidAmount: "Introduce un importe mayor que 0",
  unexpected: "No se pudo guardar el presupuesto. Inténtalo de nuevo",
  baseCurrencyOnly: "Solo se tienen en cuenta los gastos en tu moneda base",
} as const;

export function budgetErrorMessage(
  code: string | undefined,
  message: string | undefined,
): { field?: "categoryId" | "amount" | "endMonth"; message: string } {
  if (code === "23505") return { field: "categoryId", message: BUDGET_MESSAGES.duplicate };
  if (message === "budget_period_overlap") return { field: "categoryId", message: BUDGET_MESSAGES.overlap };
  if (message === "budget_invalid_dates") return { field: "endMonth", message: BUDGET_MESSAGES.invalidDates };
  if (message === "budget_invalid_category") return { field: "categoryId", message: BUDGET_MESSAGES.invalidCategory };
  if (message === "budget_invalid_amount") return { field: "amount", message: BUDGET_MESSAGES.invalidAmount };
  return { message: BUDGET_MESSAGES.unexpected };
}
