"use server";

import { ACCOUNT_MESSAGES, accountCreateSchema, accountUpdateSchema, fieldErrors } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountFormState = {
  errors?: Record<string, string>;
  error?: string;
};

function formValues(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return { name: get("name"), type: get("type"), currency: get("currency"), openingBalance: get("openingBalance") };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createAccount(_: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const parsed = accountCreateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    opening_balance: parsed.data.openingBalance,
  });
  if (error) return { error: ACCOUNT_MESSAGES.unexpected };

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccount(
  id: string,
  _: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = accountUpdateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      opening_balance: parsed.data.openingBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return { error: ACCOUNT_MESSAGES.unexpected };
  if (!data.length) return { error: ACCOUNT_MESSAGES.notFound };

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function setArchived(id: string, archived: boolean) {
  const { supabase } = await requireUser();
  await supabase
    .from("accounts")
    .update({ is_archived: archived, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function deleteAccount(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("accounts").delete().eq("id", id).select("id");
  if (error) {
    return {
      error: error.message === "account_has_transactions" ? ACCOUNT_MESSAGES.hasTransactions : ACCOUNT_MESSAGES.unexpected,
    };
  }
  if (!data.length) return { error: ACCOUNT_MESSAGES.notFound };

  revalidatePath("/accounts");
  redirect("/accounts");
}
