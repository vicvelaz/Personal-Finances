import { formatIsoDate, formatMoney, GOAL_STATUS_LABELS, GOAL_STATUSES, type GoalStatus, goalProgress, todayInTimeZone, translate } from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("goals.savingsGoals") };
}

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  status: GoalStatus;
};

export default async function GoalsPage() {
  const { locale, timezone } = await getProfilePrefs();
  const today = todayInTimeZone(timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("id, name, target_amount, current_amount, currency, target_date, status")
    .order("name")
    .returns<Goal[]>();
  if (error) throw new Error("No se pudieron cargar las metas");
  const goals = data ?? [];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold"><T id="goals.savingsGoals" /></h1>
        <Link href="/goals/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <T id="goals.newGoal" />
        </Link>
      </div>
      {goals.length === 0 && <p className="text-neutral-500"><T id="goals.donTAnySavingsGoalsYet" /></p>}
      {GOAL_STATUSES.map((status) => {
        const list = goals.filter((g) => g.status === status);
        if (list.length === 0) return null;
        return (
          <div key={status}>
            <h2 className="mb-2 text-lg font-medium"><T>{GOAL_STATUS_LABELS[status]}</T></h2>
            <ul className="flex flex-col gap-4" aria-label={translate(locale, GOAL_STATUS_LABELS[status])}>
              {list.map((g) => {
                const p = goalProgress({ target: g.target_amount, current: g.current_amount, targetDate: g.target_date, today });
                const money = (v: number) => formatMoney(v, g.currency, locale);
                return (
                  <li key={g.id} className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <Link href={`/goals/${g.id}`} className="font-medium hover:underline">{g.name}</Link>
                      <span className="text-sm">{money(g.current_amount)} <T id="common.of" /> {money(g.target_amount)} <T>·</T> {p.percent.toLocaleString(locale)}<T>%</T></span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.min(p.percent, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-neutral-500">
                      <T id="common.remaining" /> {money(p.remaining)}
                      {g.target_date && ` · ${translate(locale, "goals.targetDate", { date: formatIsoDate(g.target_date, locale) })}`}
                      {p.monthlyNeeded !== null && p.remaining > 0 && ` · ${translate(locale, "goals.monthlySavings", { amount: money(p.monthlyNeeded) })}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
