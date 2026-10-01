import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { getTransactionOptions } from "@/lib/transactions";
import { ImportForm } from "./import-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("csvImport.importCsv") };
}

export default async function ImportPage() {
  const [{ locale }, { accounts }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);
  const active = accounts.filter((a) => !a.is_archived);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold"><T id="csvImport.importTransactions" /></h1>
        <p className="text-sm text-neutral-500">
          <T id="csvImport.uploadBankCsvFinExportNegativeAmountsImportedExpensesPositiveAmountsIncomeTransactionsAlreadyAccountSkipped" />
        </p>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-neutral-500"><Link href="/accounts/new" className="underline"><T id="accounts.createAccountPrompt" /></Link> <T id="csvImport.importing" /></p>
      ) : (
        <ImportForm accounts={active} locale={locale} />
      )}
    </section>
  );
}
