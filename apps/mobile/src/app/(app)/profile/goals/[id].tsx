import { fieldErrors, formatIsoDate, formatMoney, goalAdjustSchema, goalProgress, goalSchema, minorToInput, todayInTimeZone, translate } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, FormAlert, OptionPicker, TextField } from '@/components/form';
import { type GoalFormValues, GoalFields } from '@/components/goal-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccounts } from '@/lib/accounts';
import { confirm } from '@/lib/confirm';
import { GoalError, type GoalRow, useGoalHistory, useGoalMutations, useGoals } from '@/lib/goals';
import { useProfile } from '@/lib/profile';

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useGoals();
  const profile = useProfile().data;
  if (goals.isPending) return <Screen title="Meta" />;
  const goal = goals.data?.find((g) => g.id === id);
  if (!goal) {
    return (
      <Screen titleKey="goals.goal">
        <FormAlert error="La meta no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <GoalDetail
      key={goal.id}
      goal={goal}
      locale={profile?.locale ?? 'es-ES'}
      today={todayInTimeZone(profile?.timezone ?? 'Europe/Madrid')}
    />
  );
}

function GoalDetail({ goal, locale, today }: { goal: GoalRow; locale: string; today: string }) {
  const accounts = useAccounts();
  const { update, adjust, setArchived, remove } = useGoalMutations();
  const [values, setValues] = useState<GoalFormValues>({
    name: goal.name,
    targetAmount: minorToInput(goal.target_amount, locale),
    currency: goal.currency,
    targetDate: goal.target_date ?? '',
    accountId: goal.account_id ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [moveWith, setMoveWith] = useState('');
  const [adjustError, setAdjustError] = useState<string>();
  const history = useGoalHistory(goal);
  const movable = goal.account_id
    ? (accounts.data ?? []).filter((a) => !a.is_archived && a.currency === goal.currency && a.id !== goal.account_id)
    : [];
  const moveLabels: Record<string, string> = { '': translate(locale, "transactions.transaction"), ...Object.fromEntries(movable.map((a) => [a.id, a.name])) };
  const p = goalProgress({ target: goal.target_amount, current: goal.current_amount, targetDate: goal.target_date, today });
  const money = (v: number) => formatMoney(v, goal.currency, locale);

  function onAdjust(direction: 'deposit' | 'withdraw') {
    const parsed = goalAdjustSchema.safeParse({ direction, amount, accountId: moveWith });
    if (!parsed.success) return setAdjustError(fieldErrors(parsed.error).amount);
    setAdjustError(undefined);
    adjust.mutate(
      { id: goal.id, delta: direction === 'deposit' ? parsed.data.amount : -parsed.data.amount, accountId: parsed.data.accountId },
      { onSuccess: () => setAmount(''), onError: (e) => setAdjustError(e.message) },
    );
  }

  function onSubmit() {
    const parsed = goalSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate(
      { id: goal.id, v: parsed.data },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          if (e instanceof GoalError && e.field) setErrors({ [e.field]: e.message });
        },
      },
    );
  }

  return (
    <Screen title={goal.name} translateTitle={false}>
      <ThemedText>
        {money(goal.current_amount)} de {money(goal.target_amount)} · {p.percent.toLocaleString(locale)}%
        {goal.status === 'achieved' ? ' · Conseguida' : goal.status === 'archived' ? ' · Archivada' : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Faltan {money(p.remaining)}
        {p.monthlyNeeded !== null && p.remaining > 0 ? ` · Ahorra ${money(p.monthlyNeeded)} al mes` : ''}
      </ThemedText>
      <TextField label="Importe a aportar o retirar" value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation" placeholder="0,00" error={adjustError} />
      {goal.account_id && (
        <OptionPicker label="Mover dinero con" options={Object.keys(moveLabels)} labels={moveLabels} value={moveWith} onChange={setMoveWith} />
      )}
      <View style={styles.actions}>
        <Button variant="link" title="Aportar" onPress={() => onAdjust('deposit')} />
        <Button variant="link" title="Retirar" onPress={() => onAdjust('withdraw')} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {goal.account_id
          ? 'Elige una cuenta para mover el dinero a la cuenta de la meta (o desde ella al retirar).'
          : 'Vincula una cuenta a la meta para que las aportaciones muevan dinero entre cuentas.'}
      </ThemedText>
      {(history.data ?? []).length > 0 && <ThemedText translationKey="goals.goalTransactions" />}
      {(history.data ?? []).map((t) => (
        <View key={t.id} style={styles.historyRow}>
          <ThemedText type="small">{formatIsoDate(t.occurred_on, locale)} · <ThemedText type="small" translateText={false}>{t.description}</ThemedText></ThemedText>
          <ThemedText type="small" style={{ color: t.amount < 0 ? '#dc2626' : '#15803d' }}>{money(t.amount)}</ThemedText>
        </View>
      ))}
      <GoalFields values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} accounts={accounts.data ?? []} />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      <Button
        variant="link"
        title={goal.status === 'archived' ? 'Reactivar' : 'Archivar'}
        onPress={() => setArchived.mutate({ id: goal.id, archived: goal.status !== 'archived' }, { onSuccess: () => router.back() })}
      />
      <Button
        variant="link"
        title="Borrar meta"
        onPress={async () => {
          if (await confirm('Borrar meta', goal.name, 'Borrar', false)) remove.mutate(goal.id, { onSuccess: () => router.back() });
        }}
      />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.four },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
});
