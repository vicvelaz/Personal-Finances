"use client";

import { formatMoney, minorToInput } from "@fin/shared";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import type { AccountReconciliationState } from "../actions";

export function AccountReconciliationForm({
  action,
  balance,
  currency,
  locale,
}: {
  action: (state: AccountReconciliationState, formData: FormData) => Promise<AccountReconciliationState>;
  balance: number;
  currency: string;
  locale: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const { tKey } = useTranslations();

  return (
    <section className="flex flex-col gap-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
      <h2 className="text-lg font-medium">{tKey("accounts.reconcileBalance")}</h2>
      <p className="text-sm text-neutral-500">{tKey("accounts.reconcileDescription")}</p>
      <p className="text-sm text-neutral-500">
        {tKey("dashboard.currentBalanceLabel")} {formatMoney(balance, currency, locale)}
      </p>
      <FormAlert error={state.error} />
      {state.reconciled && state.delta !== undefined && (
        <FormAlert
          message={
            state.delta === 0
              ? tKey("accounts.noAdjustmentNeeded")
              : tKey("accounts.balanceReconciled", {
                  adjustment: formatMoney(state.delta, currency, locale),
                })
          }
        />
      )}
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <Field
          labelKey="accounts.realBalance"
          name="realBalance"
          type="text"
          defaultValue={minorToInput(balance, locale)}
          error={state.errors?.realBalance}
        />
        <SubmitButton>accounts.reconcileBalance</SubmitButton>
      </form>
    </section>
  );
}
