"use client";

import { buildCategoryTree, type CategoryRow, RECURRENCE_LABELS, RECURRENCES } from "@fin/shared";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormAlert, MoneyField, SubmitButton } from "@/components/form";
import { DateInput } from "@/components/date-input";
import { useTranslations } from "@/components/i18n-provider";
import type { AccountOption } from "@/lib/transactions";
import { type ScheduledFormState, postScheduled, skipScheduled } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export type ScheduledFormValues = {
  kind: "expense" | "income";
  accountId: string;
  categoryId: string;
  amount: string;
  description: string;
  recurrence: string;
  startsOn: string;
  endsOn: string;
  isEstimated: boolean;
  autoPost: boolean;
  reminderDaysBefore: string;
};

export function ScheduledForm({
  action,
  initial,
  accounts,
  categories,
  submitLabel,
}: {
  action: (state: ScheduledFormState, formData: FormData) => Promise<ScheduledFormState>;
  initial: ScheduledFormValues;
  accounts: AccountOption[];
  categories: CategoryRow[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [kind, setKind] = useState(initial.kind);
  const tree = buildCategoryTree(categories)[kind];
  const selectable = accounts.filter((a) => !a.is_archived || a.id === initial.accountId);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} />
      <Field labelKey="fields.type" name="kind" error={state.errors?.kind}>
        <select id="field-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as "expense" | "income")} className={inputClass}>
          <option value="expense"><T id="transactions.expense" /></option>
          <option value="income"><T id="transactions.income" /></option>
        </select>
      </Field>
      <Field label="Descripción" name="description" defaultValue={initial.description} error={state.errors?.description} />
      <Field labelKey="accounts.account" name="accountId" error={state.errors?.accountId}>
        <select id="field-accountId" name="accountId" defaultValue={initial.accountId} className={inputClass}>
          <option value=""><T id="common.selectOption" /></option>
          {selectable.map((a) => (
            <option key={a.id} value={a.id}>{a.name} <T>(</T>{a.currency}<T>)</T></option>
          ))}
        </select>
      </Field>
      <Field labelKey="categories.category" name="categoryId" error={state.errors?.categoryId}>
        <select id="field-categoryId" name="categoryId" defaultValue={initial.categoryId} key={kind} className={inputClass}>
          <option value=""><T id="categories.uncategorized" /></option>
          {tree.map((c) => [
            <option key={c.id} value={c.id}>{c.name}</option>,
            ...c.children.map((ch) => (
              <option key={ch.id} value={ch.id}>{`\u00a0\u00a0\u00a0${ch.name}`}</option>
            )),
          ])}
        </select>
      </Field>
      <Field label="Importe" name="amount" error={state.errors?.amount}>
        <MoneyField
          id="field-amount"
          name="amount"
          label="Importe"
          defaultValue={initial.amount}
          currency={accounts.find((account) => account.id === initial.accountId)?.currency}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isEstimated" defaultChecked={initial.isEstimated} /> <T id="csvImport.estimatedAmountConfirmPosting" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autoPost" defaultChecked={initial.autoPost} aria-describedby={state.errors?.autoPost ? "field-autoPost-error" : undefined} /> <T id="scheduled.postAutomaticallyDue" />
      </label>
      {state.errors?.autoPost && <p id="field-autoPost-error" className="text-sm text-red-600">{state.errors.autoPost}</p>}
      <Field label="Recordar días antes (opcional, 0–30)" name="reminderDaysBefore" defaultValue={initial.reminderDaysBefore} error={state.errors?.reminderDaysBefore} />
      <Field labelKey="scheduled.frequency" name="recurrence" error={state.errors?.recurrence}>
        <select id="field-recurrence" name="recurrence" defaultValue={initial.recurrence} className={inputClass}>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}><T>{RECURRENCE_LABELS[r]}</T></option>
          ))}
        </select>
      </Field>
      <Field label="Fecha de inicio" name="startsOn" error={state.errors?.startsOn}>
        <DateInput id="field-startsOn" name="startsOn" defaultValue={initial.startsOn} />
      </Field>
      <Field label="Fecha de fin (opcional)" name="endsOn" error={state.errors?.endsOn}>
        <DateInput id="field-endsOn" name="endsOn" defaultValue={initial.endsOn} />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/scheduled" className="text-sm underline"><T id="common.cancel" /></Link>
      </div>
    </form>
  );
}

export function PostScheduled({
  id,
  isEstimated,
  amountInput,
  currency,
}: {
  id: string;
  isEstimated: boolean;
  amountInput: string;
  currency: string;
}) {
  const [state, action] = useActionState<ScheduledFormState, FormData>(postScheduled.bind(null, id), {});
  const { t } = useTranslations();
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm" noValidate>
      {isEstimated && (
        <MoneyField
          id={`scheduled-post-amount-${id}`}
          name="amount"
          defaultValue={amountInput}
          label={t("Importe real")}
          currency={currency}
          error={state.errors?.amount ?? state.error}
          className="w-24 rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
        />
      )}
      <button type="submit" className="rounded-md bg-blue-600 px-3 py-1 text-white"><T id="common.post" /></button>
      <button type="button" className="underline" onClick={() => skipScheduled(id)}><T id="common.skip" /></button>
      {(state.errors?.amount || state.error) && <span className="text-red-600">{state.errors?.amount ?? state.error}</span>}
    </form>
  );
}
