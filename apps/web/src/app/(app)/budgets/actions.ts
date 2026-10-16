"use server";

import {
  BUDGET_MESSAGES,
  budgetCreateSchema,
  budgetErrorMessage,
  budgetSchema,
  fieldErrors,
  formatMoney,
  monthRange,
  prepareBudgetMonthPlan,
  shiftMonth,
  todayInTimeZone,
} from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type BudgetFormState = { errors?: Record<string, string>; error?: string; ok?: boolean };

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function toState(error: { code?: string; message?: string }): BudgetFormState {
  const mapped = budgetErrorMessage(error.code, error.message);
  return mapped.field ? { errors: { [mapped.field]: mapped.message } } : { error: mapped.message };
}

export async function createBudget(_: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const parsed = budgetCreateSchema.safeParse({
    categoryId: str(formData, "categoryId"),
    month: str(formData, "month"),
    amount: str(formData, "amount"),
    period: str(formData, "period") || "once",
    endMonth: str(formData, "endMonth"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    period_start: monthRange(parsed.data.month)!.from,
    period: parsed.data.period,
    period_end: parsed.data.endMonth ? monthRange(parsed.data.endMonth)!.to : null,
    amount: parsed.data.amount,
  });
  if (error) return toState(error);
  revalidatePath("/budgets");
  return { ok: true };
}

export async function updateBudget(id: string, _: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const parsed = budgetSchema.pick({ amount: true }).safeParse({ amount: str(formData, "amount") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .update({ amount: parsed.data.amount, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return toState(error);
  revalidatePath("/budgets");
  return { ok: true };
}

export async function planBudgetMonth(id: string, _: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const targetMonth = str(formData, "targetMonth");
  const amount = budgetSchema.pick({ amount: true }).safeParse({ amount: str(formData, "amount") });
  if (!amount.success) return { errors: fieldErrors(amount.error) };
  if (!monthRange(targetMonth)) return { errors: { targetMonth: "Mes no válido" } };

  const { supabase, user } = await requireUser();
  const { timezone, baseCurrency, locale } = await getProfilePrefs();
  const currentMonth = todayInTimeZone(timezone).slice(0, 7);
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, period, amount")
    .eq("id", id)
    .maybeSingle<{ id: string; period: string; amount: number }>();
  if (!budget || budget.period !== "monthly") return { error: BUDGET_MESSAGES.unexpected };

  const plan = prepareBudgetMonthPlan({
    monthlyLimit: budget.amount,
    currentMonth,
    targetMonth,
    targetLimit: amount.data.amount,
  });
  if (!plan.ok) {
    if (plan.reason === "invalid_month") return { errors: { targetMonth: "Elige un mes futuro de este año" } };
    if (plan.reason === "invalid_amount") return { error: BUDGET_MESSAGES.invalidAmount };
    return { error: `El aumento excede el límite anual en ${formatMoney(plan.uncovered, baseCurrency, locale)}` };
  }

  const rows = plan.rows.map((row) => ({
    user_id: user.id,
    budget_id: id,
    period_start: monthRange(row.month)!.from,
    amount: row.amount,
  }));
  const { error } = await supabase.from("budget_month_plans").upsert(rows, { onConflict: "budget_id,period_start" });
  if (error) return toState(error);
  revalidatePath("/budgets");
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("budgets").delete().eq("id", id);
  revalidatePath("/budgets");
}

export async function copyPreviousMonth(month: string) {
  const to = monthRange(month);
  if (!to) return;
  const { supabase } = await requireUser();
  await supabase.rpc("copy_budgets", { p_from: monthRange(shiftMonth(month, -1))!.from, p_to: to.from });
  revalidatePath("/budgets");
}
