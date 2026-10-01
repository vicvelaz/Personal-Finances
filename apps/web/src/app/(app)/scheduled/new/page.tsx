import { todayInTimeZone } from "@fin/shared";
import type { Metadata } from "next";
import { getProfilePrefs } from "@/lib/profile";
import { getTransactionOptions } from "@/lib/transactions";
import { createScheduled } from "../actions";
import { ScheduledForm } from "../scheduled-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("scheduled.newScheduledButton") };
}

export default async function NewScheduledPage() {
  const [{ timezone }, { accounts, categories }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);
  const first = accounts.find((a) => !a.is_archived);
  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold"><T id="scheduled.newScheduledTitle" /></h1>
      {!first ? (
        <p className="text-neutral-500"><T id="accounts.needLeastOneActiveAccount" /></p>
      ) : (
        <ScheduledForm
          action={createScheduled}
          initial={{
            kind: "expense",
            accountId: first.id,
            categoryId: "",
            amount: "",
            description: "",
            recurrence: "monthly",
            startsOn: todayInTimeZone(timezone),
            endsOn: "",
            isEstimated: false,
            autoPost: false,
            reminderDaysBefore: "",
          }}
          accounts={accounts}
          categories={categories}
          submitLabel="Guardar programado"
        />
      )}
    </section>
  );
}
