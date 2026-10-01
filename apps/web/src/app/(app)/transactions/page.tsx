import {
  buildCategoryTree,
  escapeLike,
  formatIsoDate,
  formatMoney,
  formatMonth,
  monthRange,
  shiftMonth,
  TRANSACTION_KIND_LABELS,
  TRANSACTION_KINDS,
  TRANSACTION_PAGE_SIZE,
  translate,
  todayInTimeZone,
} from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTransactionOptions, TRANSACTION_COLUMNS, type TransactionRow } from "@/lib/transactions";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("transactions.transactions") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700";

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const sp = await searchParams;
  const [{ locale, timezone }, { accounts, categories }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);

  const month = monthRange(one(sp.month) ?? "") ? one(sp.month)! : todayInTimeZone(timezone).slice(0, 7);
  const range = monthRange(month)!;
  const kind = TRANSACTION_KINDS.find((k) => k === one(sp.kind));
  const account = one(sp.account);
  const category = one(sp.category);
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS, { count: "exact" })
    .gte("occurred_on", range.from)
    .lte("occurred_on", range.to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * TRANSACTION_PAGE_SIZE, page * TRANSACTION_PAGE_SIZE - 1);
  if (kind) query = query.eq("kind", kind);
  if (account && UUID_RE.test(account)) query = query.eq("account_id", account);
  if (category && UUID_RE.test(category)) {
    const ids = [category, ...categories.filter((c) => c.parent_id === category).map((c) => c.id)];
    query = query.in("category_id", ids);
  }
  if (q) query = query.ilike("description", `%${escapeLike(q)}%`);

  const { data, count, error } = await query.returns<TransactionRow[]>();
  if (error) throw new Error("No se pudieron cargar los movimientos");
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / TRANSACTION_PAGE_SIZE));

  const params = { month, kind, account, category, q: q || undefined };
  const href = (patch: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/transactions?${u}`;
  };
  const tree = buildCategoryTree(categories);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold"><T id="transactions.transactions" /></h1>
        <Link href="/transactions/import" className="mr-4 ml-auto text-sm underline">
          <T id="csvImport.importCsv" />
        </Link>
        <Link href="/transactions/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <T id="transactions.newTransaction" />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href={href({ month: shiftMonth(month, -1), page: undefined })} aria-label={translate(locale, "dashboard.previousMonth")} className="px-2"><T>←</T></Link>
        <span className="font-medium">{formatMonth(month, locale)}</span>
        <Link href={href({ month: shiftMonth(month, 1), page: undefined })} aria-label={translate(locale, "dashboard.nextMonth")} className="px-2"><T>→</T></Link>
      </div>

      <form method="get" action="/transactions" className="flex flex-wrap items-end gap-3" aria-label={translate(locale, "common.filters")}>
        <input type="hidden" name="month" value={month} />
        <label className="flex flex-col text-xs">
          <T id="fields.type" />
          <select name="kind" defaultValue={kind ?? ""} className={inputClass}>
            <option value=""><T id="common.allMasculine" /></option>
            {TRANSACTION_KINDS.map((k) => (
              <option key={k} value={k}><T>{TRANSACTION_KIND_LABELS[k]}</T></option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          <T id="accounts.account" />
          <select name="account" defaultValue={account ?? ""} className={inputClass}>
            <option value=""><T id="common.allFeminine" /></option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          <T id="categories.category" />
          <select name="category" defaultValue={category ?? ""} className={inputClass}>
            <option value=""><T id="common.allFeminine" /></option>
            {[...tree.expense, ...tree.income].map((c) => [
              <option key={c.id} value={c.id}>{c.name}</option>,
              ...c.children.map((ch) => (
                <option key={ch.id} value={ch.id}>{`\u00a0\u00a0\u00a0${ch.name}`}</option>
              )),
            ])}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          <T id="common.search" />
          <input name="q" defaultValue={q} placeholder={translate(locale, "fields.description")} className={inputClass} />
        </label>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"><T id="common.filter" /></button>
        <Link href={`/transactions?month=${month}`} className="text-sm underline"><T id="common.clear" /></Link>
      </form>

      {rows.length === 0 ? (
        <p className="text-neutral-500"><T id="transactions.transactionsMatchFilters" /></p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-2 font-normal"><T id="fields.date" /></th>
              <th className="font-normal"><T id="fields.description" /></th>
              <th className="font-normal"><T id="accounts.account" /></th>
              <th className="font-normal"><T id="categories.category" /></th>
              <th className="text-right font-normal"><T id="csvImport.amount" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="py-2 whitespace-nowrap">{formatIsoDate(t.occurred_on, locale)}</td>
                <td>
                  <Link href={`/transactions/${t.id}`} className="hover:underline">
                    {t.description ?? <T>{TRANSACTION_KIND_LABELS[t.kind]}</T>}
                  </Link>
                </td>
                <td>{t.account?.name}</td>
                <td>
                  {t.kind === "transfer" ? (
                    <span className="text-neutral-500"><T id="transactions.transfer" /></span>
                  ) : t.splits?.length ? (
                    <span className="text-neutral-500"><T id="transactions.split" />{t.splits.length}<T>)</T></span>
                  ) : t.category ? (
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: t.category.color ?? "#94a3b8" }} />
                      {t.category.name}
                    </span>
                  ) : (
                    <span className="text-neutral-500"><T id="categories.uncategorized" /></span>
                  )}
                </td>
                <td className={`text-right whitespace-nowrap ${t.amount < 0 ? "text-red-600" : "text-green-700"}`}>
                  {formatMoney(t.amount, t.currency, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pages > 1 && (
        <nav aria-label={translate(locale, "common.pagination")} className="flex items-center gap-4 text-sm">
          {page > 1 && <Link href={href({ page: page - 1 })} className="underline"><T id="common.previous" /></Link>}
          <span><T id="common.page" /> {page} <T id="common.of" /> {pages}</span>
          {page < pages && <Link href={href({ page: page + 1 })} className="underline"><T id="common.next" /></Link>}
        </nav>
      )}
    </section>
  );
}
