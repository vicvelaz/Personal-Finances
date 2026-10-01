import { buildCategoryTree, type CategoryRow, RECURRENCE_LABELS, RECURRENCES } from '@fin/shared';
import { Switch, View } from 'react-native';

import { OptionPicker, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import type { AccountRow } from '@/lib/accounts';
import { useLocale } from '@/lib/i18n';
import { translate } from '@fin/shared';

export type ScheduledFormValues = {
  kind: 'expense' | 'income';
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

const KIND_LABELS = { expense: 'Gasto', income: 'Ingreso' };

export function ScheduledFields({
  values,
  onChange,
  errors,
  accounts,
  categories,
}: {
  values: ScheduledFormValues;
  onChange: <K extends keyof ScheduledFormValues>(key: K, value: ScheduledFormValues[K]) => void;
  errors: Record<string, string>;
  accounts: AccountRow[];
  categories: CategoryRow[];
}) {
  const { locale } = useLocale();
  const selectable = accounts.filter((a) => !a.is_archived || a.id === values.accountId);
  const tree = buildCategoryTree(categories)[values.kind];
  const categoryLabels: Record<string, string> = { '': translate(locale, "categories.uncategorized") };
  for (const c of tree) {
    categoryLabels[c.id] = c.name;
    for (const ch of c.children) categoryLabels[ch.id] = `· ${ch.name}`;
  }

  return (
    <>
      <OptionPicker
        label="Tipo"
        options={['expense', 'income'] as const}
        labels={KIND_LABELS}
        translateLabels
        value={values.kind}
        onChange={(v) => {
          onChange('kind', v);
          onChange('categoryId', '');
        }}
        error={errors.kind}
      />
      <TextField label="Descripción" value={values.description} onChangeText={(v) => onChange('description', v)} error={errors.description} />
      <OptionPicker
        label="Cuenta"
        options={selectable.map((a) => a.id)}
        labels={Object.fromEntries(selectable.map((a) => [a.id, `${a.name} (${a.currency})`]))}
        value={values.accountId}
        onChange={(v) => onChange('accountId', v)}
        error={errors.accountId}
      />
      <OptionPicker
        label="Categoría"
        options={Object.keys(categoryLabels)}
        labels={categoryLabels}
        value={values.categoryId}
        onChange={(v) => onChange('categoryId', v)}
        error={errors.categoryId}
      />
      <TextField label="Importe" value={values.amount} onChangeText={(v) => onChange('amount', v)} keyboardType="numbers-and-punctuation" placeholder="0,00" error={errors.amount} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Switch value={values.isEstimated} onValueChange={(v) => onChange('isEstimated', v)} accessibilityLabel={translate(locale, "csvImport.estimatedAmount")} />
        <ThemedText translationKey="csvImport.estimatedAmountConfirmPosting" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Switch value={values.autoPost} onValueChange={(v) => onChange('autoPost', v)} accessibilityLabel={translate(locale, "scheduled.postAutomatically")} />
        <ThemedText translationKey="scheduled.postAutomaticallyDue" />
      </View>
      {errors.autoPost ? <ThemedText type="small" style={{ color: '#dc2626' }}>{errors.autoPost}</ThemedText> : null}
      <TextField label="Recordar días antes (opcional, 0–30)" value={values.reminderDaysBefore} onChangeText={(v) => onChange('reminderDaysBefore', v)} keyboardType="number-pad" error={errors.reminderDaysBefore} />
      <OptionPicker
        label="Periodicidad"
        options={RECURRENCES}
        labels={RECURRENCE_LABELS}
        translateLabels
        value={values.recurrence}
        onChange={(v) => onChange('recurrence', v)}
        error={errors.recurrence}
      />
      <TextField label="Fecha de inicio (AAAA-MM-DD)" value={values.startsOn} onChangeText={(v) => onChange('startsOn', v)} autoCapitalize="none" error={errors.startsOn} />
      <TextField label="Fecha de fin (opcional)" value={values.endsOn} onChangeText={(v) => onChange('endsOn', v)} autoCapitalize="none" placeholder="AAAA-MM-DD" error={errors.endsOn} />
    </>
  );
}
