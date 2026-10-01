"use server";

import { fieldErrors, goalAdjustSchema, goalErrorMessage, goalSchema } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type GoalFormState = { errors?: Record<string, string>; error?: string; ok?: boolean };

function get(formData: FormData, k: string) {
  const v = formData.get(k);
  return typeof v === "string" ? v : "";
}

function goalValues(formData: FormData) {
  return {
    name: get(formData, "name"),
    targetAmount: get(formData, "targetAmount"),
    currency: get(formData, "currency"),
    targetDate: get(formData, "targetDate"),
    accountId: get(formData, "accountId"),
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function toState(error: { message?: string }): GoalFormState {
  const mapped = goalErrorMessage(error.message);
  return mapped.field ? { errors: { [mapped.field]: mapped.message } } : { error: mapped.message };
}

export async function createGoal(_: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const parsed = goalSchema.safeParse(goalValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase, user } = await requireUser();
  const v = parsed.data;
  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name: v.name,
    target_amount: v.targetAmount,
    currency: v.currency,
    target_date: v.targetDate,
    account_id: v.accountId,
  });
  if (error) return toState(error);
  revalidatePath("/goals");
  redirect("/goals");
}

export async function updateGoal(id: string, _: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const parsed = goalSchema.safeParse(goalValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase } = await requireUser();
  const v = parsed.data;
  const { data, error } = await supabase
    .from("savings_goals")
    .update({
      name: v.name,
      target_amount: v.targetAmount,
      currency: v.currency,
      target_date: v.targetDate,
      account_id: v.accountId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return toState(error);
  if (!data.length) return toState({ message: "goal_not_found" });
  revalidatePath("/goals");
  redirect("/goals");
}

export async function adjustGoal(id: string, _: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const parsed = goalAdjustSchema.safeParse({
    direction: get(formData, "direction"),
    amount: get(formData, "amount"),
    accountId: get(formData, "accountId"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase } = await requireUser();
  const delta = parsed.data.direction === "deposit" ? parsed.data.amount : -parsed.data.amount;
  const { error } = await supabase.rpc("adjust_goal", { p_id: id, p_delta: delta, p_account: parsed.data.accountId });
  if (error) return toState(error);
  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  if (parsed.data.accountId) {
    revalidatePath("/accounts");
    revalidatePath("/transactions");
  }
  return { ok: true };
}

export async function setGoalArchived(id: string, archived: boolean) {
  const { supabase } = await requireUser();
  // Un-archiving sets 'active'; the trigger recomputes achieved/active from the amounts.
  await supabase.from("savings_goals").update({ status: archived ? "archived" : "active" }).eq("id", id);
  revalidatePath("/goals");
  redirect("/goals");
}

export async function deleteGoal(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("savings_goals").delete().eq("id", id);
  revalidatePath("/goals");
  redirect("/goals");
}
