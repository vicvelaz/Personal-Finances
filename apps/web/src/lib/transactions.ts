import "server-only";

import type { AccountType, CategoryRow, TransactionKind } from "@fin/shared";
import { createClient } from "@/lib/supabase/server";

export type AccountOption = { id: string; name: string; currency: string; type: AccountType; is_archived: boolean };

/** Accounts and categories used by transaction forms and filters. */
export async function getTransactionOptions() {
  const supabase = await createClient();
  const [accounts, categories] = await Promise.all([
    supabase.from("accounts").select("id, name, currency, type, is_archived").order("name").returns<AccountOption[]>(),
    supabase.from("categories").select("id, name, kind, parent_id, color").returns<CategoryRow[]>(),
  ]);
  return { accounts: accounts.data ?? [], categories: categories.data ?? [] };
}

export type TransactionRow = {
  id: string;
  kind: TransactionKind;
  amount: number;
  currency: string;
  occurred_on: string;
  description: string | null;
  notes: string | null;
  transfer_group_id: string | null;
  account_id: string;
  category_id: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
  splits: { id: string }[];
};

export const TRANSACTION_COLUMNS =
  "id, kind, amount, currency, occurred_on, description, notes, transfer_group_id, account_id, category_id, account:accounts(id, name), category:categories(id, name, color), splits:transaction_splits(id)";
