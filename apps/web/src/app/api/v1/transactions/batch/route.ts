import { importDuplicateKey, isValidIsoDate, MAX_IMPORT_ROWS } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rowSchema = z.object({
  line: z.number().int().positive(),
  occurredOn: z.string().refine(isValidIsoDate),
  amount: z.number().int().refine((amount) => amount !== 0 && Number.isSafeInteger(amount)),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  description: z.string().max(120).nullable(),
  accountId: z.uuid(),
  destinationAccountId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
});

const requestSchema = z.object({ rows: z.array(rowSchema).min(1).max(MAX_IMPORT_ROWS) });

type AccountRow = { id: string; currency: string; is_archived: boolean };
type CategoryRow = { id: string; kind: string };
type ExistingTransaction = {
  id: string;
  occurred_on: string;
  amount: number;
  description: string | null;
  account_id: string;
  kind: string;
  transfer_group_id: string | null;
};

function transferKey(
  occurredOn: string,
  from: string,
  to: string,
  amount: number,
  description: string | null,
) {
  return `transfer|${occurredOn}|${from}|${to}|${amount}|${(description ?? "").trim().toLocaleLowerCase()}`;
}

function ordinaryKey(accountId: string, row: { occurredOn: string; amount: number; description: string | null }) {
  return `ordinary|${accountId}|${importDuplicateKey(row)}`;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("invalid_request", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("unauthorized", 401);

  const rows = parsed.data.rows;
  for (const row of rows) {
    if ((row.type === "EXPENSE" && row.amount >= 0) || (row.type === "INCOME" && row.amount <= 0)) {
      return errorResponse("invalid_amount_sign", 400);
    }
    if (row.type === "TRANSFER" && (row.amount <= 0 || !row.destinationAccountId || row.categoryId)) {
      return errorResponse("invalid_transfer", 400);
    }
    if (row.type !== "TRANSFER" && row.destinationAccountId) return errorResponse("unexpected_destination", 400);
  }

  const accountIds = [...new Set(rows.flatMap((row) => [row.accountId, row.destinationAccountId].filter((id): id is string => Boolean(id))))];
  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id, currency, is_archived")
    .in("id", accountIds)
    .returns<AccountRow[]>();
  if (accountError) return errorResponse("account_lookup_failed", 500);
  const accountsById = new Map((accounts ?? []).map((account) => [account.id, account]));
  if (accountsById.size !== accountIds.length || [...accountsById.values()].some((account) => account.is_archived)) {
    return errorResponse("invalid_or_archived_account", 400);
  }

  const categoryIds = [...new Set(rows.flatMap((row) => (row.categoryId ? [row.categoryId] : [])))];
  let categoriesById = new Map<string, CategoryRow>();
  if (categoryIds.length) {
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, kind")
      .in("id", categoryIds)
      .returns<CategoryRow[]>();
    if (categoryError) return errorResponse("category_lookup_failed", 500);
    categoriesById = new Map((categories ?? []).map((category) => [category.id, category]));
    if (categoriesById.size !== categoryIds.length) return errorResponse("invalid_category", 400);
  }

  for (const row of rows) {
    const source = accountsById.get(row.accountId)!;
    if (row.type === "TRANSFER") {
      const destination = accountsById.get(row.destinationAccountId!)!;
      if (source.id === destination.id) return errorResponse("transfer_same_account", 400);
      if (source.currency !== destination.currency) return errorResponse("transfer_currency_mismatch", 400);
    } else if (row.categoryId) {
      const category = categoriesById.get(row.categoryId);
      const expectedKind = row.type.toLowerCase();
      if (!category || category.kind !== expectedKind) return errorResponse("invalid_category", 400);
    }
  }

  const dates = rows.map((row) => row.occurredOn).sort();
  const existingRows: ExistingTransaction[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, occurred_on, amount, description, account_id, kind, transfer_group_id")
      .in("account_id", accountIds)
      .gte("occurred_on", dates[0]!)
      .lte("occurred_on", dates.at(-1)!)
      .order("id")
      .range(from, from + 999)
      .returns<ExistingTransaction[]>();
    if (error) return errorResponse("duplicate_lookup_failed", 500);
    existingRows.push(...data);
    if (data.length < 1000) break;
  }

  const existingByKey = new Set<string>();
  const transferGroups = new Map<string, ExistingTransaction[]>();
  for (const transaction of existingRows ?? []) {
    if (transaction.kind === "transfer" && transaction.transfer_group_id) {
      const group = transferGroups.get(transaction.transfer_group_id) ?? [];
      group.push(transaction);
      transferGroups.set(transaction.transfer_group_id, group);
    } else if (transaction.kind === "expense" || transaction.kind === "income") {
      existingByKey.add(
        ordinaryKey(transaction.account_id, {
          occurredOn: transaction.occurred_on,
          amount: transaction.amount,
          description: transaction.description,
        }),
      );
    }
  }
  for (const group of transferGroups.values()) {
    const source = group.find((leg) => leg.amount < 0);
    const destination = group.find((leg) => leg.amount > 0);
    if (group.length === 2 && source && destination) {
      existingByKey.add(
        transferKey(source.occurred_on, source.account_id, destination.account_id, Math.abs(source.amount), source.description),
      );
    }
  }

  const accepted: typeof rows = [];
  let skipped = 0;
  for (const row of rows) {
    const key =
      row.type === "TRANSFER"
        ? transferKey(row.occurredOn, row.accountId, row.destinationAccountId!, row.amount, row.description)
        : ordinaryKey(row.accountId, {
            occurredOn: row.occurredOn,
            amount: row.amount,
            description: row.description,
          });
    if (existingByKey.has(key)) {
      skipped++;
    } else {
      existingByKey.add(key);
      accepted.push(row);
    }
  }

  const failures: { line: number; error: string }[] = [];
  const ordinaryRows = accepted.filter((row) => row.type !== "TRANSFER");
  let imported = 0;
  if (ordinaryRows.length) {
    const { error } = await supabase.from("transactions").insert(
      ordinaryRows.map((row) => ({
        user_id: user.id,
        account_id: row.accountId,
        category_id: row.categoryId,
        kind: row.type === "EXPENSE" ? "expense" : "income",
        amount: row.type === "EXPENSE" ? -Math.abs(row.amount) : Math.abs(row.amount),
        occurred_on: row.occurredOn,
        description: row.description,
      })),
    );
    if (error) {
      failures.push(...ordinaryRows.map((row) => ({ line: row.line, error: "transaction_insert_failed" })));
    } else {
      imported += ordinaryRows.length;
    }
  }

  for (const row of accepted) {
    if (row.type !== "TRANSFER") continue;
    const { error } = await supabase.rpc("create_transfer", {
      p_from: row.accountId,
      p_to: row.destinationAccountId!,
      p_amount: Math.abs(row.amount),
      p_occurred_on: row.occurredOn,
      p_description: row.description,
      p_notes: null,
      p_to_amount: null,
    });
    if (error) failures.push({ line: row.line, error: "transfer_creation_failed" });
    else imported++;
  }

  if (imported) {
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
  }
  return NextResponse.json({ imported, skipped, failed: failures.length, errors: failures }, { status: failures.length ? 207 : 200 });
}
