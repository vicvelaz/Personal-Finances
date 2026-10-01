"use server";

import { budgetErrorMessage, budgetSchema, fieldErrors, monthRange, shiftMonth } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const parsed = budgetSchema.safeParse({
    categoryId: str(formData, "categoryId"),
    month: str(formData, "month"),
    amount: str(formData, "amount"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    period_start: monthRange(parsed.data.month)!.from,
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
