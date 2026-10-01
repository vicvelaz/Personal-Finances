"use server";

import { fieldErrors, postAmountSchema, scheduledErrorMessage, scheduledSchema } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ScheduledFormState = { errors?: Record<string, string>; error?: string };

function formValues(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    kind: get("kind"),
    accountId: get("accountId"),
    categoryId: get("categoryId"),
    amount: get("amount"),
    description: get("description"),
    recurrence: get("recurrence"),
    startsOn: get("startsOn"),
    endsOn: get("endsOn"),
    isEstimated: formData.get("isEstimated") === "on",
    autoPost: formData.get("autoPost") === "on",
    reminderDaysBefore: get("reminderDaysBefore"),
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

function toState(error: { message?: string }): ScheduledFormState {
  const mapped = scheduledErrorMessage(error.message);
  return mapped.field ? { errors: { [mapped.field]: mapped.message } } : { error: mapped.message };
}

function refresh() {
  revalidatePath("/scheduled");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

function columns(v: ReturnType<typeof scheduledSchema.parse>) {
  return {
    kind: v.kind,
    account_id: v.accountId,
    category_id: v.categoryId,
    amount: v.kind === "expense" ? -v.amount : v.amount,
    description: v.description,
    recurrence: v.recurrence,
    starts_on: v.startsOn,
    ends_on: v.endsOn,
    is_estimated: v.isEstimated,
    auto_post: v.autoPost,
    reminder_days_before: v.reminderDaysBefore,
  };
}

export async function createScheduled(_: ScheduledFormState, formData: FormData): Promise<ScheduledFormState> {
  const parsed = scheduledSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase, user } = await requireUser();
  // next_run_on is reset to starts_on by the database trigger.
  const { error } = await supabase
    .from("scheduled_transactions")
    .insert({ user_id: user.id, next_run_on: parsed.data.startsOn, ...columns(parsed.data) });
  if (error) return toState(error);
  refresh();
  redirect("/scheduled");
}

export async function updateScheduled(id: string, _: ScheduledFormState, formData: FormData): Promise<ScheduledFormState> {
  const parsed = scheduledSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("scheduled_transactions")
    .update({ ...columns(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return toState(error);
  if (!data.length) return toState({ message: "scheduled_not_found" });
  refresh();
  redirect("/scheduled");
}

export async function setScheduledActive(id: string, active: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("scheduled_transactions").update({ is_active: active }).eq("id", id);
  refresh();
}

export async function deleteScheduled(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("scheduled_transactions").delete().eq("id", id);
  refresh();
  redirect("/scheduled");
}

export async function postScheduled(id: string, _: ScheduledFormState, formData: FormData): Promise<ScheduledFormState> {
  const amount = postAmountSchema.safeParse(formData.get("amount") ?? "");
  if (!amount.success) return { errors: fieldErrors(amount.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("post_scheduled", { p_id: id, p_amount: amount.data });
  if (error) return toState(error);
  refresh();
  return {};
}

export async function skipScheduled(id: string) {
  const { supabase } = await requireUser();
  await supabase.rpc("skip_scheduled", { p_id: id });
  refresh();
}
