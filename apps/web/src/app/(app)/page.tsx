import {
  budgetStatus,
  type CategoryTotal,
  formatMoney,
  formatMonth,
  goalProgress,
  groupTopCategories,
  monthRange,
  netSavings,
  shiftMonth,
  todayInTimeZone,
  totalsByCurrency,
  translate,
} from "@fin/shared";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { CategoryChart, TrendChart } from "./dashboard-charts";
import { T } from "@/components/i18n-provider";

type MonthTotal = { month: string; income: number; expense: number };
type Progress = { budget_id: string; category_name: string; amount: number; spent: number };
type NetWorth = { total: number; currency: string; missing: string[] };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { locale, timezone, baseCurrency } = await getProfilePrefs();
  const today = todayInTimeZone(timezone);
  const requested = typeof sp.month === "string" ? sp.month : "";
  const month = monthRange(requested) ? requested : today.slice(0, 7);
  const range = monthRange(month)!;
  const trendFrom = monthRange(shiftMonth(month, -5))!.from;

  const supabase = await createClient();
  const [totals, categories, accounts, budgets, due, goals, worth] = await Promise.all([
    supabase.rpc("monthly_totals", { p_from: trendFrom, p_to: range.to }),
    supabase.rpc("expenses_by_category", { p_from: range.from, p_to: range.to }),
    supabase.from("account_balances").select("currency, balance, is_archived"),
    supabase.rpc("budget_progress", { p_month: range.from }),
    supabase.from("scheduled_transactions").select("id", { count: "exact", head: true }).eq("is_active", true).lte("next_run_on", today),
    supabase.from("savings_goals").select("id, name, target_amount, current_amount, currency, target_date").eq("status", "active").order("name"),
    supabase.rpc("net_worth").maybeSingle<NetWorth>(),
  ]);

  const trend = (totals.data ?? []) as MonthTotal[];
  const current = trend.at(-1) ?? { income: 0, expense: 0 };
  const money = (v: number) => formatMoney(v, baseCurrency, locale);
  const balances = totalsByCurrency(
    (accounts.data ?? []).map((a) => ({ currency: a.currency, balance: a.balance, isArchived: a.is_archived })),
  );
  const slices = groupTopCategories((categories.data ?? []) as CategoryTotal[]);
  const alerts = ((budgets.data ?? []) as Progress[])
    .map((b) => ({ ...b, status: budgetStatus(b.amount, b.spent) }))
    .filter((b) => b.status.level !== "ok");
  const dueCount = due.count ?? 0;

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold"><T id="dashboard.overview" /></h1>
        <div className="flex items-center gap-3">
          <Link href={`/?month=${shiftMonth(month, -1)}`} aria-label={translate(locale, "dashboard.previousMonth")} className="px-2"><T>←</T></Link>
          <span className="font-medium">{formatMonth(month, locale)}</span>
          <Link href={`/?month=${shiftMonth(month, 1)}`} aria-label={translate(locale, "dashboard.nextMonth")} className="px-2"><T>→</T></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3" aria-label={translate(locale, "dashboard.monthlySummary")}>
        <Stat label={translate(locale, "transactions.incomes")} value={money(current.income)} className="text-green-700" />
        <Stat label={translate(locale, "transactions.expenses")} value={money(current.expense)} className="text-red-600" />
        <Stat label={translate(locale, "accounts.netSavings")} value={money(netSavings(current.income, current.expense))} />
      </div>
      <p className="-mt-6 text-xs text-neutral-500"><T id="csvImport.amountsConverted" /> {baseCurrency}<T id="transactions.excludingTransfers" /></p>

      {(dueCount > 0 || alerts.length > 0) && (
        <ul className="flex flex-col gap-2 rounded-md bg-amber-50 p-4 text-sm dark:bg-amber-950" aria-label={translate(locale, "dashboard.alerts")}>
          {dueCount > 0 && (
            <li>
              <Link href="/scheduled" className="underline">
                {dueCount === 1
                  ? translate(locale, "scheduled.message1ScheduledTransactionDue")
                  : translate(locale, "scheduled.countScheduledTransactionsDue", { count: dueCount })}
              </Link>
            </li>
          )}
          {alerts.map((b) => (
            <li key={b.budget_id}>
              <Link href={`/budgets?month=${month}`} className="underline">
                {translate(locale, "categories.categoryStatusPercent", {
                  category: b.category_name,
                  status: translate(locale, b.status.level === "over" ? "budgets.budgetExceeded" : "budgets.budgetRisk"),
                  percent: b.status.percent,
                })}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="dashboard.spendingCategory" /></h2>
          {slices.length === 0 ? (
            <p className="text-sm text-neutral-500"><T id="dashboard.spendingMonth" /></p>
          ) : (
            <CategoryChart data={slices} currency={baseCurrency} locale={locale} />
          )}
        </div>
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="dashboard.last6Months" /></h2>
          <TrendChart
            data={trend.map((t) => ({
              label: formatMonth(t.month.slice(0, 7), locale).split(" ")[0]!.slice(0, 3),
              income: t.income / 100,
              expense: t.expense / 100,
            }))}
            currency={baseCurrency}
            locale={locale}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="dashboard.balanceCurrency" /></h2>
          {worth.data && balances.length > 0 && (
            <p className="mb-3" aria-label={translate(locale, "dashboard.netWorth")}>
              <span className="text-sm text-neutral-500"><T id="dashboard.netWorth" /></span>{" "}
              <strong className="text-xl">{formatMoney(worth.data.total, worth.data.currency, locale)}</strong>
              {worth.data.missing.length > 0 && (
                <span className="block text-xs text-amber-700"><T id="common.exchangeRate" /> {worth.data.missing.join(", ")}</span>
              )}
            </p>
          )}
          {balances.length === 0 ? (
            <p className="text-sm text-neutral-500"><Link href="/accounts/new" className="underline"><T id="accounts.createFirstAccount" /></Link><T>.</T></p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {balances.map((b) => (
                <li key={b.currency} className="rounded-md bg-neutral-100 px-4 py-2 dark:bg-neutral-900">
                  <span className="text-sm text-neutral-500">{b.currency}</span>{" "}
                  <strong>{formatMoney(b.total, b.currency, locale)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="goals.savingsGoals" /></h2>
          {(goals.data ?? []).length === 0 ? (
            <p className="text-sm text-neutral-500"><Link href="/goals/new" className="underline"><T id="goals.createGoalLink" /></Link><T>.</T></p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label={translate(locale, "goals.activeGoals")}>
              {(goals.data ?? []).map((g) => {
                const p = goalProgress({ target: g.target_amount, current: g.current_amount, targetDate: g.target_date, today });
                return (
                  <li key={g.id}>
                    <Link href={`/goals/${g.id}`} className="flex justify-between text-sm hover:underline">
                      <span>{g.name}</span>
                      <span>{p.percent.toLocaleString(locale)}<T>%</T></span>
                    </Link>
                    <div className="mt-1 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800">
                      <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(p.percent, 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}
