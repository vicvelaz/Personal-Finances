import {
  BUDGET_MESSAGES,
  budgetStatus,
  buildCategoryTree,
  type CategoryRow,
  formatMoney,
  formatMonth,
  minorToInput,
  monthRange,
  shiftMonth,
  translate,
  todayInTimeZone,
} from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { copyPreviousMonth } from "./actions";
import { BudgetRow, NewBudgetForm } from "./budget-forms";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("budgets.budgets") };
}

type Progress = {
  budget_id: string;
  category_id: string;
  category_name: string;
  color: string | null;
  parent_id: string | null;
  amount: number;
  spent: number;
};

export default async function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  const sp = await searchParams;
  const { locale, timezone, baseCurrency } = await getProfilePrefs();
  const requested = typeof sp.month === "string" ? sp.month : "";
  const month = monthRange(requested) ? requested : todayInTimeZone(timezone).slice(0, 7);

  const supabase = await createClient();
  const [{ data: progress, error }, { data: categories }] = await Promise.all([
    supabase.rpc("budget_progress", { p_month: monthRange(month)!.from }),
    supabase.from("categories").select("id, name, kind, parent_id, color").eq("kind", "expense").returns<CategoryRow[]>(),
  ]);
  if (error) throw new Error("No se pudieron cargar los presupuestos");

  const rows = (progress ?? []) as Progress[];
  const budgeted = new Set(rows.map((r) => r.category_id));
  const available = buildCategoryTree(categories ?? []).expense.flatMap((c) => [c, ...c.children]).filter((c) => !budgeted.has(c.id));
  const totals = rows.reduce((acc, r) => ({ amount: acc.amount + r.amount, spent: acc.spent + r.spent }), { amount: 0, spent: 0 });
  const money = (v: number) => formatMoney(v, baseCurrency, locale);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold"><T id="budgets.budgets" /></h1>
      <div className="flex items-center gap-3">
        <Link href={`/budgets?month=${shiftMonth(month, -1)}`} aria-label={translate(locale, "dashboard.previousMonth")} className="px-2"><T>←</T></Link>
        <span className="font-medium">{formatMonth(month, locale)}</span>
        <Link href={`/budgets?month=${shiftMonth(month, 1)}`} aria-label={translate(locale, "dashboard.nextMonth")} className="px-2"><T>→</T></Link>
      </div>
      <p className="text-sm text-neutral-500"><T>{BUDGET_MESSAGES.baseCurrencyOnly}</T> <T>(</T>{baseCurrency}<T>).</T></p>

      {rows.length === 0 ? (
        <p className="text-neutral-500"><T id="dashboard.budgetsMonth" /></p>
      ) : (
        <>
          <p>
            <T id="dashboard.totalLabel" /> <strong>{money(totals.spent)}</strong> <T id="budgets.spent" /> <strong>{money(totals.amount)}</strong>
          </p>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((r) => {
              const s = budgetStatus(r.amount, r.spent);
              return (
                <BudgetRow
                  key={r.budget_id}
                  id={r.budget_id}
                  name={r.category_name}
                  color={r.color}
                  isChild={r.parent_id !== null}
                  amountInput={minorToInput(r.amount, locale)}
                  amountLabel={money(r.amount)}
                  spentLabel={money(r.spent)}
                  remainingLabel={money(s.remaining)}
                  percent={s.percent}
                  level={s.level}
                />
              );
            })}
          </ul>
        </>
      )}

      <NewBudgetForm month={month} categories={available} />
      <form action={copyPreviousMonth.bind(null, month)}>
        <button type="submit" className="text-sm underline"><T id="dashboard.copyLastMonthSBudgets" /></button>
      </form>
    </section>
  );
}
