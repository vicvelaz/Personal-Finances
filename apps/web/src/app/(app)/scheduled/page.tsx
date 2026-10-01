import {
  formatIsoDate,
  formatMoney,
  isDue,
  minorToInput,
  RECURRENCE_LABELS,
  type Recurrence,
  todayInTimeZone,
  translate,
} from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { PostScheduled } from "./scheduled-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("scheduled.scheduled") };
}

export type ScheduledRow = {
  id: string;
  kind: "expense" | "income";
  amount: number;
  currency: string;
  description: string;
  recurrence: Recurrence;
  next_run_on: string;
  ends_on: string | null;
  is_estimated: boolean;
  auto_post: boolean;
  is_active: boolean;
  account: { name: string } | null;
  category: { name: string } | null;
};

export default async function ScheduledPage() {
  const { locale, timezone } = await getProfilePrefs();
  const today = todayInTimeZone(timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_transactions")
    .select("id, kind, amount, currency, description, recurrence, next_run_on, ends_on, is_estimated, auto_post, is_active, account:accounts(name), category:categories(name)")
    .order("next_run_on")
    .returns<ScheduledRow[]>();
  if (error) throw new Error("No se pudieron cargar los programados");

  const rows = data ?? [];
  const due = rows.filter((r) => r.is_active && isDue(r.next_run_on, today));
  const upcoming = rows.filter((r) => r.is_active && !isDue(r.next_run_on, today));
  const inactive = rows.filter((r) => !r.is_active);

  const item = (r: ScheduledRow, actions?: React.ReactNode) => (
    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <Link href={`/scheduled/${r.id}`} className="font-medium hover:underline">{r.description}</Link>
        <p className="text-sm text-neutral-500">
          <T>{RECURRENCE_LABELS[r.recurrence]}</T> <T>·</T> {r.account?.name} <T>·</T> {r.category?.name ?? <T id="categories.uncategorized" />}
          {r.is_active && ` · ${translate(locale, "fields.nextDate", { date: formatIsoDate(r.next_run_on, locale) })}`}
          {r.is_estimated && ` ${translate(locale, "scheduled.estimatedSuffix")}`}
          {r.auto_post && ` ${translate(locale, "scheduled.automaticSuffix")}`}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className={r.amount < 0 ? "text-red-600" : "text-green-700"}>{formatMoney(r.amount, r.currency, locale)}</span>
        {actions}
      </div>
    </li>
  );

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold"><T id="scheduled.scheduledTransactions" /></h1>
        <Link href="/scheduled/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <T id="scheduled.newScheduledButton" />
        </Link>
      </div>
      {rows.length === 0 && <p className="text-neutral-500"><T id="scheduled.emptyState" /></p>}
      {due.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="scheduled.overdue" /></h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800" aria-label={translate(locale, "scheduled.overdue")}>
            {due.map((r) => item(r, <PostScheduled id={r.id} isEstimated={r.is_estimated} amountInput={minorToInput(Math.abs(r.amount), locale)} />))}
          </ul>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="common.upcoming" /></h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800" aria-label={translate(locale, "common.upcoming")}>{upcoming.map((r) => item(r))}</ul>
        </div>
      )}
      {inactive.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium"><T id="scheduled.inactiveSection" /></h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800" aria-label={translate(locale, "scheduled.inactiveSection")}>{inactive.map((r) => item(r))}</ul>
        </div>
      )}
    </section>
  );
}
