import { formatIsoDate, formatMoney, type GoalStatus, goalProgress, minorToInput, todayInTimeZone, translate } from "@fin/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTransactionOptions } from "@/lib/transactions";
import { deleteGoal, setGoalArchived, updateGoal } from "../actions";
import { AdjustGoal, GoalForm } from "../goal-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("goals.savingsGoal") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  account_id: string | null;
  status: GoalStatus;
};

export default async function GoalPage({ params }: PageProps<"/goals/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: g } = await supabase
    .from("savings_goals")
    .select("id, name, target_amount, current_amount, currency, target_date, account_id, status")
    .eq("id", id)
    .maybeSingle<Goal>();
  // RLS hides other users' goals, so they are indistinguishable from missing ones.
  if (!g) notFound();
  const [{ locale, timezone }, { accounts }, { data: history }] = await Promise.all([
    getProfilePrefs(),
    getTransactionOptions(),
    // The leg on the goal's account: positive = contribution, negative = withdrawal.
    supabase
      .from("transactions")
      .select("id, occurred_on, amount, description")
      .eq("goal_id", id)
      .eq("account_id", g.account_id ?? "00000000-0000-0000-0000-000000000000")
      .order("occurred_on", { ascending: false })
      .limit(20)
      .returns<{ id: string; occurred_on: string; amount: number; description: string | null }[]>(),
  ]);
  const movable = g.account_id
    ? accounts.filter((a) => !a.is_archived && a.currency === g.currency && a.id !== g.account_id)
    : undefined;
  const p = goalProgress({
    target: g.target_amount,
    current: g.current_amount,
    targetDate: g.target_date,
    today: todayInTimeZone(timezone),
  });
  const money = (v: number) => formatMoney(v, g.currency, locale);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{g.name}</h1>
        <p className="text-neutral-500">
          {money(g.current_amount)} <T id="common.of" /> {money(g.target_amount)} <T>·</T> {p.percent.toLocaleString(locale)}<T>%</T>
          {g.status === "achieved" && translate(locale, "goals.achievedStatusSuffix")}
          {g.status === "archived" && translate(locale, "goals.archivedStatusSuffix")}
        </p>
        <p className="text-sm text-neutral-500">
          <T id="common.remaining" /> {money(p.remaining)}
          {p.monthlyNeeded !== null && p.remaining > 0 && ` · ${translate(locale, "goals.monthlySavings", { amount: money(p.monthlyNeeded) })}`}
        </p>
      </div>
      <AdjustGoal id={id} currency={g.currency} accounts={movable} />
      <p className="text-xs text-neutral-500">
          <T>{g.account_id
          ? "Elige una cuenta para mover el dinero a la cuenta de la meta (o desde ella al retirar)."
            : "Vincula una cuenta a la meta para que las aportaciones muevan dinero entre cuentas."}</T>
      </p>
      {(history ?? []).length > 0 && (
        <div>
          <h2 className="mb-2 font-medium"><T id="goals.goalTransactions" /></h2>
          <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800" aria-label={translate(locale, "goals.goalTransactions")}>
            {(history ?? []).map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>{formatIsoDate(t.occurred_on, locale)} <T>·</T> {t.description}</span>
                <span className={t.amount < 0 ? "text-red-600" : "text-green-700"}>{money(t.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <GoalForm
        action={updateGoal.bind(null, id)}
        initial={{
          name: g.name,
          targetAmount: minorToInput(g.target_amount, locale),
          currency: g.currency,
          targetDate: g.target_date ?? "",
          accountId: g.account_id ?? "",
        }}
        accounts={accounts}
        submitLabel="Guardar cambios"
      />
      <div className="flex gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <form action={setGoalArchived.bind(null, id, g.status !== "archived")}>
          <button type="submit" className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
            {translate(locale, g.status === "archived" ? "common.restore" : "common.archive")}
          </button>
        </form>
        <form action={deleteGoal.bind(null, id)}>
          <button type="submit" className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"><T id="goals.deleteGoal" /></button>
        </form>
      </div>
    </section>
  );
}
