import { formatIsoDate, formatMoney, minorToInput, translate } from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTransactionOptions } from "@/lib/transactions";
import { updateTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";
import { DeleteTransaction } from "./delete-transaction";
import { SplitEditor } from "./split-editor";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("transactions.editTransaction") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Leg = {
  id: string;
  kind: "expense" | "income" | "transfer" | "adjustment";
  amount: number;
  currency: string;
  account_id: string;
  category_id: string | null;
  occurred_on: string;
  description: string | null;
  notes: string | null;
  transfer_group_id: string | null;
  account: { name: string } | null;
};

export default async function EditTransactionPage({ params }: PageProps<"/transactions/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const columns =
    "id, kind, amount, currency, account_id, category_id, occurred_on, description, notes, transfer_group_id, account:accounts(name)";
  const { data: tx } = await supabase.from("transactions").select(columns).eq("id", id).maybeSingle<Leg>();
  // RLS hides other users' transactions, so they are indistinguishable from missing ones.
  if (!tx) notFound();
  const { locale } = await getProfilePrefs();
  if (tx.kind === "adjustment") {
    return (
      <section className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold"><T id="transactions.balanceAdjustment" /></h1>
        <p className="text-neutral-500">
          {formatIsoDate(tx.occurred_on, locale)} · {tx.account?.name}
        </p>
        <p className={`text-lg font-medium ${tx.amount < 0 ? "text-red-600" : "text-green-700"}`}>
          {formatMoney(tx.amount, tx.currency, locale)}
        </p>
        <Link href="/transactions" className="text-sm underline"><T id="transactions.transactions" /></Link>
      </section>
    );
  }

  let accountId = tx.account_id;
  let toAccountId = "";
  let toAmount = "";
  if (tx.transfer_group_id) {
    const { data: legs } = await supabase
      .from("transactions")
      .select("account_id, amount, currency")
      .eq("transfer_group_id", tx.transfer_group_id)
      .returns<{ account_id: string; amount: number; currency: string }[]>();
    const out = legs?.find((l) => l.amount < 0);
    const into = legs?.find((l) => l.amount > 0);
    accountId = out?.account_id ?? tx.account_id;
    toAccountId = into?.account_id ?? "";
    if (out && into && out.currency !== into.currency) toAmount = minorToInput(into.amount, locale);
  }

  const [{ accounts, categories }, { data: splits }] = await Promise.all([
    getTransactionOptions(),
    supabase
      .from("transaction_splits")
      .select("category_id, amount")
      .eq("transaction_id", id)
      .order("created_at")
      .returns<{ category_id: string | null; amount: number }[]>(),
  ]);
  const isTransfer = tx.kind === "transfer";

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{translate(locale, isTransfer ? "transactions.editTransfer" : "transactions.editTransaction")}</h1>
      <TransactionForm
        action={updateTransaction.bind(null, id)}
        initial={{
          kind: tx.kind,
          accountId,
          toAccountId,
          categoryId: tx.category_id ?? "",
          amount: minorToInput(Math.abs(tx.amount), locale),
          occurredOn: tx.occurred_on,
          description: tx.description ?? "",
          notes: tx.notes ?? "",
          toAmount,
        }}
        accounts={accounts}
        categories={categories}
        allowedKinds={isTransfer ? ["transfer"] : ["expense", "income"]}
        submitLabel="Guardar cambios"
      />
      {(tx.kind === "expense" || tx.kind === "income") && (
        <SplitEditor
          id={id}
          kind={tx.kind}
          total={Math.abs(tx.amount)}
          currency={tx.currency}
          locale={locale}
          categories={categories}
          initial={(splits ?? []).map((s) => ({ categoryId: s.category_id ?? "", amount: minorToInput(Math.abs(s.amount), locale) }))}
        />
      )}
      <DeleteTransaction id={id} isTransfer={isTransfer} />
    </section>
  );
}
