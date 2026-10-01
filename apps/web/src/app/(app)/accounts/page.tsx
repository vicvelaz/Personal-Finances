import { ACCOUNT_TYPE_LABELS, type AccountType, formatMoney, totalsByCurrency, translate } from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("accounts.accounts") };
}

type Row = { id: string; name: string; type: AccountType; currency: string; balance: number; is_archived: boolean };

export default async function AccountsPage() {
  const supabase = await createClient();
  const [{ data, error }, { locale }] = await Promise.all([
    supabase
      .from("account_balances")
      .select("id, name, type, currency, balance, is_archived")
      .order("name")
      .returns<Row[]>(),
    getProfilePrefs(),
  ]);
  if (error) throw new Error("No se pudieron cargar las cuentas");

  const rows = data ?? [];
  const active = rows.filter((r) => !r.is_archived);
  const archived = rows.filter((r) => r.is_archived);
  const totals = totalsByCurrency(rows.map((r) => ({ currency: r.currency, balance: r.balance, isArchived: r.is_archived })));

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold"><T id="accounts.accounts" /></h1>
        <Link href="/accounts/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <T id="accounts.newAccount" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-500">
          <T id="accounts.donTAnyAccountsYet" /> <Link href="/accounts/new" className="underline"><T id="accounts.createFirstAccount" /></Link><T>.</T>
        </p>
      ) : (
        <>
          {totals.length > 0 && (
            <ul aria-label={translate(locale, "profile.totalsCurrency")} className="flex flex-wrap gap-3">
              {totals.map((t) => (
                <li key={t.currency} className="rounded-md bg-neutral-100 px-4 py-2 dark:bg-neutral-900">
                  <span className="text-sm text-neutral-500"><T id="common.total" /> {t.currency}</span>{" "}
                  <strong>{formatMoney(t.total, t.currency, locale)}</strong>
                </li>
              ))}
            </ul>
          )}
          <AccountList title="Activas" rows={active} locale={locale} />
          {archived.length > 0 && <AccountList title="Archivadas" rows={archived} locale={locale} />}
        </>
      )}
    </section>
  );
}

function AccountList({ title, rows, locale }: { title: string; rows: Row[]; locale: string }) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-medium"><T>{title}</T></h2>
      <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/accounts/${r.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-sm text-neutral-500"><T>{ACCOUNT_TYPE_LABELS[r.type]}</T></span>
              </span>
              <span className={r.balance < 0 ? "text-red-600" : ""}>{formatMoney(r.balance, r.currency, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
