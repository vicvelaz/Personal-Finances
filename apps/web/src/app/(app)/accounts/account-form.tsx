"use client";

import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, SUPPORTED_CURRENCIES } from "@fin/shared";
import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { AccountFormState } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export type AccountFormValues = {
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
};

export function AccountForm({
  action,
  initial,
  currencyLocked,
  submitLabel,
}: {
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  initial: AccountFormValues;
  currencyLocked?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} />
      <Field label="Nombre" name="name" defaultValue={initial.name} error={state.errors?.name} />
      <Field labelKey="fields.type" name="type" error={state.errors?.type}>
        <select id="field-type" name="type" defaultValue={initial.type} className={inputClass}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}><T>{ACCOUNT_TYPE_LABELS[t]}</T></option>
          ))}
        </select>
      </Field>
      <Field labelKey="profile.currency" name="currency" error={state.errors?.currency}>
        {currencyLocked ? (
          <input id="field-currency" value={initial.currency} readOnly disabled className={`${inputClass} opacity-70`} />
        ) : (
          <select id="field-currency" name="currency" defaultValue={initial.currency} className={inputClass}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </Field>
      <Field
        label="Saldo inicial"
        name="openingBalance"
        defaultValue={initial.openingBalance}
        error={state.errors?.openingBalance}
      />
      <p className="-mt-2 text-xs text-neutral-500"><T id="accounts.negativeAmountDebtsCreditCardsLoans" /></p>
      <div className="flex items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/accounts" className="text-sm underline"><T id="common.cancel" /></Link>
      </div>
    </form>
  );
}
