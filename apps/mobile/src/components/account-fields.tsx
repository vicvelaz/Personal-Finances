import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  SUPPORTED_CURRENCIES,
} from '@fin/shared';

import { OptionPicker, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';

export type AccountFormValues = {
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
};

export function AccountFields({
  values,
  onChange,
  errors,
  currencyLocked,
}: {
  values: AccountFormValues;
  onChange: (key: keyof AccountFormValues, value: string) => void;
  errors: Record<string, string>;
  currencyLocked?: boolean;
}) {
  return (
    <>
      <TextField label="Nombre" value={values.name} onChangeText={(v) => onChange('name', v)} error={errors.name} />
      <OptionPicker
        label="Tipo"
        options={ACCOUNT_TYPES}
        labels={ACCOUNT_TYPE_LABELS}
        translateLabels
        value={values.type}
        onChange={(v) => onChange('type', v)}
        error={errors.type}
      />
      {currencyLocked ? (
        <>
          <ThemedText translationKey="profile.currency" />
          <ThemedText themeColor="textSecondary">{values.currency}</ThemedText>
        </>
      ) : (
        <OptionPicker
          label="Moneda"
          options={SUPPORTED_CURRENCIES}
          value={values.currency}
          onChange={(v) => onChange('currency', v)}
          error={errors.currency}
        />
      )}
      <TextField
        label="Saldo inicial"
        value={values.openingBalance}
        onChangeText={(v) => onChange('openingBalance', v)}
        keyboardType="numbers-and-punctuation"
        placeholder="0,00"
        error={errors.openingBalance}
      />
      <ThemedText translationKey="accounts.negativeAmountDebtsCreditCardsLoans" />
    </>
  );
}
