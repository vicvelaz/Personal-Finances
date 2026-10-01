"use server";

import { importDuplicateKey, importRowSchema, MAX_IMPORT_ROWS, TRANSACTION_MESSAGES, transactionErrorMessage } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ImportState = { error?: string; message?: string };

const PAGE = 1000;
const payloadSchema = z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export async function importTransactions(_: ImportState, formData: FormData): Promise<ImportState> {
  const accountId = z.uuid().safeParse(formData.get("accountId"));
  if (!accountId.success) return { error: "Selecciona una cuenta" };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { error: "Los datos a importar no son válidos" };
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return { error: "Los datos a importar no son válidos" };
  const rows = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: account } = await supabase.from("accounts").select("id").eq("id", accountId.data).maybeSingle();
  if (!account) return { error: TRANSACTION_MESSAGES.invalidAccount };

  // Existing movements in the file's date range, counted per key so repeated legitimate rows survive a first import.
  const dates = rows.map((r) => r.occurredOn).sort();
  const existing = new Map<string, number>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, amount, description")
      .eq("account_id", accountId.data)
      .gte("occurred_on", dates[0]!)
      .lte("occurred_on", dates.at(-1)!)
      .order("id")
      .range(from, from + PAGE - 1)
      .returns<{ occurred_on: string; amount: number; description: string | null }[]>();
    if (error) return { error: TRANSACTION_MESSAGES.unexpected };
    for (const t of data) {
      const key = importDuplicateKey({ occurredOn: t.occurred_on, amount: t.amount, description: t.description });
      existing.set(key, (existing.get(key) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
  }

  const { data: categories } = await supabase.from("categories").select("id, name, kind").returns<{ id: string; name: string; kind: string }[]>();
  const byName = new Map((categories ?? []).map((c) => [`${c.kind}|${c.name.trim().toLowerCase()}`, c.id]));

  let skipped = 0;
  const inserts = [];
  for (const r of rows) {
    const key = importDuplicateKey(r);
    const count = existing.get(key) ?? 0;
    if (count > 0) {
      existing.set(key, count - 1);
      skipped++;
      continue;
    }
    const kind = r.amount < 0 ? "expense" : "income";
    inserts.push({
      user_id: user.id,
      account_id: accountId.data,
      kind,
      amount: r.amount,
      occurred_on: r.occurredOn,
      description: r.description,
      category_id: r.category ? (byName.get(`${kind}|${r.category.trim().toLowerCase()}`) ?? null) : null,
    });
  }

  if (inserts.length) {
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) return { error: transactionErrorMessage(error.message).message };
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
  }

  const imported = plural(inserts.length, "movimiento importado", "movimientos importados");
  return { message: skipped ? `${imported}, ${plural(skipped, "duplicado omitido", "duplicados omitidos")}` : imported };
}
