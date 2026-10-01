import {
  fieldErrors,
  formatIsoDate,
  formatMoney,
  isDue,
  minorToInput,
  postAmountSchema,
  RECURRENCE_LABELS,
  todayInTimeZone,
  translate,
} from '@fin/shared';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FormAlert, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/lib/profile';
import { type ScheduledRow, useScheduled, useScheduledMutations } from '@/lib/scheduled';

export default function ScheduledScreen() {
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const today = todayInTimeZone(profile?.timezone ?? 'Europe/Madrid');
  const scheduled = useScheduled();
  const rows = scheduled.data ?? [];
  const due = rows.filter((r) => r.is_active && isDue(r.next_run_on, today));
  const upcoming = rows.filter((r) => r.is_active && !isDue(r.next_run_on, today));
  const inactive = rows.filter((r) => !r.is_active);

  return (
    <Screen titleKey="scheduled.scheduled">
      <Button title="Nuevo programado" onPress={() => router.push('/profile/scheduled/new')} />
      {scheduled.isError && <FormAlert error="No se pudieron cargar los programados" />}
      {scheduled.isSuccess && rows.length === 0 && (
        <ThemedText translationKey="scheduled.emptyState" />
      )}
      {due.length > 0 && <ThemedText translationKey="scheduled.overdue" />}
      {due.map((r) => (
        <Item key={r.id} row={r} locale={locale} due />
      ))}
      {upcoming.length > 0 && <ThemedText translationKey="common.upcoming" />}
      {upcoming.map((r) => (
        <Item key={r.id} row={r} locale={locale} />
      ))}
      {inactive.length > 0 && <ThemedText translationKey="scheduled.inactiveSection" />}
      {inactive.map((r) => (
        <Item key={r.id} row={r} locale={locale} />
      ))}
      <Button variant="link" title="Volver" onPress={() => router.back()} />
    </Screen>
  );
}

function Item({ row, locale, due }: { row: ScheduledRow; locale: string; due?: boolean }) {
  const { post, skip } = useScheduledMutations();
  const [amount, setAmount] = useState(minorToInput(Math.abs(row.amount), locale));
  const [error, setError] = useState<string>();

  function onPost() {
    const parsed = postAmountSchema.safeParse(row.is_estimated ? amount : '');
    if (!parsed.success) return setError(fieldErrors(parsed.error)._form ?? 'Importe no válido');
    setError(undefined);
    post.mutate({ id: row.id, amount: parsed.data }, { onError: (e) => setError(e.message) });
  }

  return (
    <ThemedView type="backgroundElement" style={styles.item}>
      <Link href={{ pathname: '/profile/scheduled/[id]', params: { id: row.id } }} asChild>
        <Pressable accessibilityRole="link" style={styles.header}>
          <View style={styles.flex}>
            <ThemedText translateText={false}>{row.description}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {translate(locale, RECURRENCE_LABELS[row.recurrence])} · <ThemedText type="small" themeColor="textSecondary" translateText={false}>{row.account?.name}</ThemedText>
              {row.is_active ? ` · ${formatIsoDate(row.next_run_on, locale)}` : ''}
              {row.is_estimated ? ` ${translate(locale, "scheduled.estimatedSuffix")}` : ''}
              {row.auto_post ? ` ${translate(locale, "scheduled.automaticSuffix")}` : ''}
            </ThemedText>
          </View>
          <ThemedText style={row.amount < 0 ? styles.negative : styles.positive}>
            {formatMoney(row.amount, row.currency, locale)}
          </ThemedText>
        </Pressable>
      </Link>
      {due && (
        <>
          {row.is_estimated && (
            <TextField label={`Importe real de ${row.description}`} value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation" />
          )}
          {error && <FormAlert error={error} />}
          <View style={styles.actions}>
            <Button variant="link" title="Registrar" onPress={onPost} />
            <Button variant="link" title="Omitir" onPress={() => skip.mutate(row.id)} />
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.four },
  negative: { color: '#dc2626' },
  positive: { color: '#15803d' },
});
