"use server";

import { fieldErrors, parseSplits, signedAmount, TRANSACTION_MESSAGES, transactionErrorMessage, transactionSchema } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TransactionFormState = {
  errors?: Record<string, string>;
  error?: string;
};

const FIELDS = ["kind", "accountId", "toAccountId", "categoryId", "amount", "occurredOn", "description", "notes", "toAmount"] as const;

function formValues(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((k) => {
      const v = formData.get(k);
      return [k, typeof v === "string" ? v : ""];
    }),
  );
}

function toState(error: { message?: string }): TransactionFormState {
  const mapped = transactionErrorMessage(error.message);
  return mapped.field ? { errors: { [mapped.field]: mapped.message } } : { error: mapped.message };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function done(): never {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  redirect("/transactions");
}

export async function createTransaction(_: TransactionFormState, formData: FormData): Promise<TransactionFormState> {
  const parsed = transactionSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { supabase, user } = await requireUser();

  const { error } =
    v.kind === "transfer"
      ? await supabase.rpc("create_transfer", {
          p_from: v.accountId,
          p_to: v.toAccountId,
          p_amount: v.amount,
          p_occurred_on: v.occurredOn,
          p_description: v.description,
          p_notes: v.notes,
          p_to_amount: v.toAmount,
        })
      : await supabase.from("transactions").insert({
          user_id: user.id,
          kind: v.kind,
          account_id: v.accountId,
          category_id: v.categoryId,
          amount: signedAmount(v.kind, v.amount),
          occurred_on: v.occurredOn,
          description: v.description,
          notes: v.notes,
        });
  if (error) return toState(error);
  done();
}

export async function updateTransaction(
  id: string,
  _: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const parsed = transactionSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("transactions")
    .select("kind, transfer_group_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: TRANSACTION_MESSAGES.notFound };
  if ((existing.kind === "transfer") !== (v.kind === "transfer")) {
    return { errors: { kind: "No se puede convertir un movimiento en transferencia ni al revés" } };
  }

  const { error } =
    v.kind === "transfer"
      ? await supabase.rpc("update_transfer", {
          p_group: existing.transfer_group_id,
          p_from: v.accountId,
          p_to: v.toAccountId,
          p_amount: v.amount,
          p_occurred_on: v.occurredOn,
          p_description: v.description,
          p_notes: v.notes,
          p_to_amount: v.toAmount,
        })
      : await supabase
          .from("transactions")
          .update({
            kind: v.kind,
            account_id: v.accountId,
            category_id: v.categoryId,
            amount: signedAmount(v.kind, v.amount),
            occurred_on: v.occurredOn,
            description: v.description,
            notes: v.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
  if (error) return toState(error);
  done();
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase.from("transactions").select("transfer_group_id").eq("id", id).maybeSingle();
  if (!existing) return { error: TRANSACTION_MESSAGES.notFound };

  const query = supabase.from("transactions").delete();
  const { error } = existing.transfer_group_id
    ? await query.eq("transfer_group_id", existing.transfer_group_id)
    : await query.eq("id", id);
  if (error) return { error: TRANSACTION_MESSAGES.unexpected };
  done();
}

export type SplitState = { errors?: Record<string, string>; error?: string; message?: string };

function refreshSplits(id: string) {
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function saveSplits(id: string, _: SplitState, formData: FormData): Promise<SplitState> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { error: TRANSACTION_MESSAGES.unexpected };
  }
  if (!Array.isArray(raw)) return { error: TRANSACTION_MESSAGES.unexpected };
  const lines = raw.map((l) => ({ categoryId: String(l?.categoryId ?? ""), amount: String(l?.amount ?? "") }));

  const { supabase } = await requireUser();
  const { data: tx } = await supabase.from("transactions").select("amount").eq("id", id).maybeSingle<{ amount: number }>();
  if (!tx) return { error: TRANSACTION_MESSAGES.notFound };

  const parsed = parseSplits(lines, Math.abs(tx.amount));
  if (!parsed.ok) return { errors: parsed.errors };
  const { error } = await supabase.rpc("set_transaction_splits", { p_transaction_id: id, p_splits: parsed.splits });
  if (error) return { error: transactionErrorMessage(error.message).message };
  refreshSplits(id);
  return { message: "División guardada" };
}

export async function removeSplits(id: string): Promise<SplitState> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_transaction_splits", { p_transaction_id: id, p_splits: [] });
  if (error) return { error: transactionErrorMessage(error.message).message };
  refreshSplits(id);
  return { message: "División eliminada" };
}
