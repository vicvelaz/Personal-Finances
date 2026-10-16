"use client";

import { SUPPORTED_CURRENCIES } from "@fin/shared";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormAlert, MoneyField, SubmitButton } from "@/components/form";
import { DateInput } from "@/components/date-input";
import { useTranslations } from "@/components/i18n-provider";
import type { AccountOption } from "@/lib/transactions";
import { adjustGoal, type GoalFormState } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export type GoalFormValues = {
  name: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  accountId: string;
};

export function GoalForm({
  action,
  initial,
  accounts,
  submitLabel,
}: {
  action: (state: GoalFormState, formData: FormData) => Promise<GoalFormState>;
  initial: GoalFormValues;
  accounts: AccountOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [currency, setCurrency] = useState(initial.currency);
  const options = accounts.filter((a) => a.currency === currency && (!a.is_archived || a.id === initial.accountId));
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} />
      <Field label="Nombre" name="name" defaultValue={initial.name} error={state.errors?.name} />
      <Field label="Objetivo" name="targetAmount" error={state.errors?.targetAmount}>
        <MoneyField
          id="field-targetAmount"
          name="targetAmount"
          label="Objetivo"
          defaultValue={initial.targetAmount}
          currency={currency}
        />
      </Field>
      <Field labelKey="profile.currency" name="currency" error={state.errors?.currency}>
        <select id="field-currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha objetivo (opcional)" name="targetDate" error={state.errors?.targetDate}>
        <DateInput id="field-targetDate" name="targetDate" defaultValue={initial.targetDate} />
      </Field>
      <Field labelKey="accounts.linkedAccountOptional" name="accountId" error={state.errors?.accountId}>
        <select id="field-accountId" name="accountId" defaultValue={initial.accountId} key={currency} className={inputClass}>
          <option value=""><T id="common.none" /></option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/goals" className="text-sm underline"><T id="common.cancel" /></Link>
      </div>
    </form>
  );
}

export function AdjustGoal({
  id,
  currency,
  accounts,
}: {
  id: string;
  currency: string;
  accounts?: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<GoalFormState, FormData>(adjustGoal.bind(null, id), {});
  const { t } = useTranslations();
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" aria-label={t("Aportar o retirar")} noValidate>
      <label className="flex flex-col text-xs">
        <T id="fields.action" />
        <select name="direction" className={inputClass}>
          <option value="deposit"><T id="goals.contribute" /></option>
          <option value="withdraw"><T id="goals.withdraw" /></option>
        </select>
      </label>
      <label className="flex flex-col text-xs">
        <T id="csvImport.amount" />
        <MoneyField id="goal-adjust-amount" name="amount" label="Importe" currency={currency} />
      </label>
      {accounts && (
        <label className="flex flex-col text-xs">
          <T id="common.moveMoneyUsing" />
          <select name="accountId" className={inputClass}>
            <option value=""><T id="transactions.transaction" /></option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
      )}
      <SubmitButton><T id="common.apply" /></SubmitButton>
      {(state.errors?.amount || state.errors?.accountId || state.error) && (
        <p role="alert" className="text-sm text-red-600">{t(state.errors?.amount ?? state.errors?.accountId ?? state.error ?? "")}</p>
      )}
    </form>
  );
}
