import {
  buildCategoryTree,
  type CategoryRow,
  TRANSACTION_KIND_LABELS,
  translate,
  type TransactionInput,
} from '@fin/shared';

import { MoneyField, OptionPicker, TextField } from '@/components/form';
import { DateField } from '@/components/date-field';
import type { AccountRow } from '@/lib/accounts';
import { useLocale } from '@/lib/i18n';

export type TransactionFormValues = {
  kind: TransactionInput['kind'];
  accountId: string;
  toAccountId: string;
  categoryId: string;
  amount: string;
  occurredOn: string;
  description: string;
  notes: string;
  toAmount: string;
};

const NONE = '';

export function TransactionFields({
  values,
  onChange,
  errors,
  accounts,
  categories,
  allowedKinds,
}: {
  values: TransactionFormValues;
  onChange: (key: keyof TransactionFormValues, value: string) => void;
  errors: Record<string, string>;
  accounts: AccountRow[];
  categories: CategoryRow[];
  allowedKinds: readonly TransactionInput['kind'][];
}) {
  const { locale } = useLocale();
  // Archived accounts stay selectable only if the transaction already uses them.
  const selectable = accounts.filter(
    (a) => !a.is_archived || a.id === values.accountId || a.id === values.toAccountId,
  );
  const accountLabels = Object.fromEntries(selectable.map((a) => [a.id, `${a.name} (${a.currency})`]));
  const currencyOf = (id: string) => accounts.find((a) => a.id === id)?.currency;
  const toCurrency = currencyOf(values.toAccountId);
  const crossCurrency =
    values.kind === 'transfer' && !!toCurrency && !!currencyOf(values.accountId) && currencyOf(values.accountId) !== toCurrency;

  const tree = values.kind === 'transfer' ? [] : buildCategoryTree(categories)[values.kind];
  const categoryIds = [NONE, ...tree.flatMap((c) => [c.id, ...c.children.map((ch) => ch.id)])];
  const categoryLabels: Record<string, string> = { [NONE]: translate(locale, "categories.uncategorized") };
  for (const c of tree) {
    categoryLabels[c.id] = c.name;
    for (const ch of c.children) categoryLabels[ch.id] = `· ${ch.name}`;
  }

  return (
    <>
      <OptionPicker
        label="Tipo"
        options={allowedKinds}
        labels={TRANSACTION_KIND_LABELS}
        translateLabels
        value={values.kind}
        onChange={(v) => {
          onChange('kind', v);
          onChange('categoryId', NONE);
        }}
        error={errors.kind}
      />
      <OptionPicker
        label={values.kind === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
        options={selectable.map((a) => a.id)}
        labels={accountLabels}
        value={values.accountId}
        onChange={(v) => onChange('accountId', v)}
        error={errors.accountId}
      />
      {values.kind === 'transfer' ? (
        <OptionPicker
          label="Cuenta destino"
          options={selectable.map((a) => a.id)}
          labels={accountLabels}
          value={values.toAccountId}
          onChange={(v) => onChange('toAccountId', v)}
          error={errors.toAccountId}
        />
      ) : (
        <OptionPicker
          label="Categoría"
          options={categoryIds}
          labels={categoryLabels}
          value={values.categoryId}
          onChange={(v) => onChange('categoryId', v)}
          error={errors.categoryId}
        />
      )}
      <MoneyField
        label="Importe"
        value={values.amount}
        onChangeText={(v) => onChange('amount', v)}
        currency={currencyOf(values.accountId)}
        placeholder="0,00"
        error={errors.amount}
      />
      {crossCurrency && (
        <MoneyField
          label={`Importe recibido (${toCurrency})`}
          value={values.toAmount}
          onChangeText={(v) => onChange('toAmount', v)}
          currency={toCurrency}
          placeholder="0,00"
          error={errors.toAmount}
        />
      )}
      <DateField
        label="Fecha (DD/MM/YYYY)"
        value={values.occurredOn}
        onChange={(v) => onChange('occurredOn', v)}
        error={errors.occurredOn}
      />
      <TextField
        label="Descripción"
        value={values.description}
        onChangeText={(v) => onChange('description', v)}
        error={errors.description}
      />
      <TextField
        label="Notas"
        value={values.notes}
        onChangeText={(v) => onChange('notes', v)}
        multiline
        error={errors.notes}
      />
    </>
  );
}
