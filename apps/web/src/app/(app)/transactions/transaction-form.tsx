"use client";

import {
  buildCategoryTree,
  type CategoryRow,
  TRANSACTION_KIND_LABELS,
  type TransactionInput,
} from "@fin/shared";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { AccountOption } from "@/lib/transactions";
import type { TransactionFormState } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export type TransactionFormValues = {
  kind: TransactionInput["kind"];
  accountId: string;
  toAccountId: string;
  categoryId: string;
  amount: string;
  occurredOn: string;
  description: string;
  notes: string;
  toAmount: string;
};

export function TransactionForm({
  action,
  initial,
  accounts,
  categories,
  allowedKinds,
  submitLabel,
}: {
  action: (state: TransactionFormState, formData: FormData) => Promise<TransactionFormState>;
  initial: TransactionFormValues;
  accounts: AccountOption[];
  categories: CategoryRow[];
  allowedKinds: readonly TransactionInput["kind"][];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [kind, setKind] = useState<TransactionInput["kind"]>(initial.kind);
  const [fromId, setFromId] = useState(initial.accountId);
  const [toId, setToId] = useState(initial.toAccountId);
  const currencyOf = (id: string) => accounts.find((a) => a.id === id)?.currency;
  const toCurrency = currencyOf(toId);
  const crossCurrency = kind === "transfer" && !!toCurrency && !!currencyOf(fromId) && currencyOf(fromId) !== toCurrency;
  // Archived accounts stay selectable only if the transaction already uses them.
  const selectable = accounts.filter(
    (a) => !a.is_archived || a.id === initial.accountId || a.id === initial.toAccountId,
  );
  const tree = kind === "transfer" ? [] : buildCategoryTree(categories)[kind];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} />
      <Field labelKey="fields.type" name="kind" error={state.errors?.kind}>
        <select
          id="field-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as TransactionInput["kind"])}
          className={inputClass}
        >
          {allowedKinds.map((k) => (
            <option key={k} value={k}><T>{TRANSACTION_KIND_LABELS[k]}</T></option>
          ))}
        </select>
      </Field>
      <Field label={kind === "transfer" ? "Cuenta origen" : "Cuenta"} name="accountId" error={state.errors?.accountId}>
        <select id="field-accountId" name="accountId" defaultValue={initial.accountId} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
          <option value=""><T id="common.selectOption" /></option>
          {selectable.map((a) => (
            <option key={a.id} value={a.id}>{a.name} <T>(</T>{a.currency}<T>)</T></option>
          ))}
        </select>
      </Field>
      {kind === "transfer" ? (
        <Field labelKey="accounts.destinationAccount" name="toAccountId" error={state.errors?.toAccountId}>
          <select id="field-toAccountId" name="toAccountId" defaultValue={initial.toAccountId} onChange={(e) => setToId(e.target.value)} className={inputClass}>
            <option value=""><T id="common.selectOption" /></option>
            {selectable.map((a) => (
              <option key={a.id} value={a.id}>{a.name} <T>(</T>{a.currency}<T>)</T></option>
            ))}
          </select>
        </Field>
      ) : (
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
      )}
      <Field label="Importe" name="amount" defaultValue={initial.amount} error={state.errors?.amount} />
      {crossCurrency && (
        <Field label={`Importe recibido (${toCurrency})`} name="toAmount" defaultValue={initial.toAmount} error={state.errors?.toAmount} />
      )}
      <Field label="Fecha" name="occurredOn" type="date" defaultValue={initial.occurredOn} error={state.errors?.occurredOn} />
      <Field label="Descripción" name="description" defaultValue={initial.description} error={state.errors?.description} />
      <Field labelKey="fields.notes" name="notes" error={state.errors?.notes}>
        <textarea id="field-notes" name="notes" defaultValue={initial.notes} rows={3} className={inputClass} />
      </Field>
      <div className="flex items-center gap-4">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/transactions" className="text-sm underline"><T id="common.cancel" /></Link>
      </div>
    </form>
  );
}
