import { TRANSACTION_KINDS, todayInTimeZone } from "@fin/shared";
import type { Metadata } from "next";
import { getProfilePrefs } from "@/lib/profile";
import { getTransactionOptions } from "@/lib/transactions";
import { createTransaction } from "../actions";
import { TransactionForm } from "../transaction-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("transactions.newTransaction") };
}

export default async function NewTransactionPage() {
  const [{ timezone }, { accounts, categories }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);
  const firstActive = accounts.find((a) => !a.is_archived);

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold"><T id="transactions.newTransaction" /></h1>
      {!firstActive ? (
        <p className="text-neutral-500"><T id="transactions.needLeastOneActiveAccountRecordTransactions" /></p>
      ) : (
        <TransactionForm
          action={createTransaction}
          initial={{
            kind: "expense",
            accountId: firstActive.id,
            toAccountId: "",
            categoryId: "",
            amount: "",
            occurredOn: todayInTimeZone(timezone),
            description: "",
            notes: "",
            toAmount: "",
          }}
          accounts={accounts}
          categories={categories}
          allowedKinds={TRANSACTION_KINDS}
          submitLabel="Guardar movimiento"
        />
      )}
    </section>
  );
}
