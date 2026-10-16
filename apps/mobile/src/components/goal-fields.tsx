import { SUPPORTED_CURRENCIES, translate } from '@fin/shared';

import { MoneyField, OptionPicker, TextField } from '@/components/form';
import { DateField } from '@/components/date-field';
import type { AccountRow } from '@/lib/accounts';
import { useLocale } from '@/lib/i18n';

export type GoalFormValues = {
  name: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  accountId: string;
};

export function GoalFields({
  values,
  onChange,
  errors,
  accounts,
}: {
  values: GoalFormValues;
  onChange: (key: keyof GoalFormValues, value: string) => void;
  errors: Record<string, string>;
  accounts: AccountRow[];
}) {
  const { locale } = useLocale();
  const options = accounts.filter(
    (a) => a.currency === values.currency && (!a.is_archived || a.id === values.accountId),
  );
  const labels: Record<string, string> = { '': translate(locale, "common.none"), ...Object.fromEntries(options.map((a) => [a.id, a.name])) };
  return (
    <>
      <TextField label="Nombre" value={values.name} onChangeText={(v) => onChange('name', v)} error={errors.name} />
      <MoneyField label="Objetivo" value={values.targetAmount} onChangeText={(v) => onChange('targetAmount', v)} currency={values.currency} placeholder="0,00" error={errors.targetAmount} />
      <OptionPicker
        label="Moneda"
        options={SUPPORTED_CURRENCIES}
        value={values.currency}
        onChange={(v) => {
          onChange('currency', v);
          onChange('accountId', '');
        }}
        error={errors.currency}
      />
      <DateField label="Fecha objetivo (opcional)" value={values.targetDate} onChange={(v) => onChange('targetDate', v)} error={errors.targetDate} />
      <OptionPicker label="Cuenta asociada" options={Object.keys(labels)} labels={labels} value={values.accountId} onChange={(v) => onChange('accountId', v)} error={errors.accountId} />
    </>
  );
}
