import type { Metadata } from "next";
import { getProfilePrefs } from "@/lib/profile";
import { getTransactionOptions } from "@/lib/transactions";
import { createGoal } from "../actions";
import { GoalForm } from "../goal-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("goals.newGoal") };
}

export default async function NewGoalPage() {
  const [{ baseCurrency }, { accounts }] = await Promise.all([getProfilePrefs(), getTransactionOptions()]);
  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold"><T id="goals.newSavingsGoal" /></h1>
      <GoalForm
        action={createGoal}
        initial={{ name: "", targetAmount: "", currency: baseCurrency, targetDate: "", accountId: "" }}
        accounts={accounts}
        submitLabel="Crear meta"
      />
    </section>
  );
}
