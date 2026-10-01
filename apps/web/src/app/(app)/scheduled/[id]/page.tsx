import { minorToInput } from "@fin/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getTransactionOptions } from "@/lib/transactions";
import { deleteScheduled, setScheduledActive, updateScheduled } from "../actions";
import { ScheduledForm } from "../scheduled-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("scheduled.editScheduledTransaction") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  kind: "expense" | "income";
  account_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  recurrence: string;
  starts_on: string;
  ends_on: string | null;
  is_estimated: boolean;
  auto_post: boolean;
  reminder_days_before: number | null;
  is_active: boolean;
};

export default async function EditScheduledPage({ params }: PageProps<"/scheduled/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("scheduled_transactions")
    .select("id, kind, account_id, category_id, amount, description, recurrence, starts_on, ends_on, is_estimated, auto_post, reminder_days_before, is_active")
    .eq("id", id)
    .maybeSingle<Row>();
  // RLS hides other users' schedules, so they are indistinguishable from missing ones.
  if (!s) notFound();
  const [{ locale }, { accounts, categories }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{s.description}</h1>
      <ScheduledForm
        action={updateScheduled.bind(null, id)}
        initial={{
          kind: s.kind,
          accountId: s.account_id,
          categoryId: s.category_id ?? "",
          amount: minorToInput(Math.abs(s.amount), locale),
          description: s.description,
          recurrence: s.recurrence,
          startsOn: s.starts_on,
          endsOn: s.ends_on ?? "",
          isEstimated: s.is_estimated,
          autoPost: s.auto_post,
          reminderDaysBefore: s.reminder_days_before?.toString() ?? "",
        }}
        accounts={accounts}
        categories={categories}
        submitLabel="Guardar cambios"
      />
      <div className="flex gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <form action={setScheduledActive.bind(null, id, !s.is_active)}>
          <button type="submit" className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
            {s.is_active ? "Pausar" : "Reactivar"}
          </button>
        </form>
        <form action={deleteScheduled.bind(null, id)}>
          <button type="submit" className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700">
            <T id="scheduled.deleteScheduledTransaction" />
          </button>
        </form>
      </div>
      <p className="text-xs text-neutral-500"><T id="transactions.deletingRuleNotAffectTransactionsAlreadyPosted" /></p>
    </section>
  );
}
