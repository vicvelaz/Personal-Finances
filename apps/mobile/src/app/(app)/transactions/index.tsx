import {
  formatIsoDate,
  formatMoney,
  formatMonth,
  shiftMonth,
  TRANSACTION_KIND_LABELS,
  TRANSACTION_KINDS,
  todayInTimeZone,
  translate,
  type TransactionKind,
} from '@fin/shared';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FormAlert, OptionPicker } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/lib/profile';
import { useTransactions } from '@/lib/transactions';

const ALL = '';
const KIND_OPTIONS = [ALL, ...TRANSACTION_KINDS] as const;
const KIND_LABELS = { [ALL]: 'Todos', ...TRANSACTION_KIND_LABELS };

export default function TransactionsScreen() {
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const [month, setMonth] = useState(() => todayInTimeZone(profile?.timezone ?? 'Europe/Madrid').slice(0, 7));
  const [kind, setKind] = useState<TransactionKind | typeof ALL>(ALL);
  const query = useTransactions(month, kind || undefined);
  const rows = query.data?.pages.flat() ?? [];

  return (
    <Screen titleKey="transactions.transactions">
      <Button title="Nuevo movimiento" onPress={() => router.push('/transactions/new')} />
      <View style={styles.monthNav}>
        <Button variant="link" title="←" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
        <ThemedText type="smallBold">{formatMonth(month, locale)}</ThemedText>
        <Button variant="link" title="→" onPress={() => setMonth((m) => shiftMonth(m, 1))} />
      </View>
      <OptionPicker label="Tipo" options={KIND_OPTIONS} labels={KIND_LABELS} translateLabels value={kind} onChange={setKind} />
      {query.isError && <FormAlert error="No se pudieron cargar los movimientos" />}
      {query.isSuccess && rows.length === 0 && (
        <ThemedText translationKey="dashboard.transactionsMonth" />
      )}
      {rows.map((t) => (
        <Link key={t.id} href={{ pathname: '/transactions/[id]', params: { id: t.id } }} asChild>
          <Pressable accessibilityRole="link">
            <ThemedView type="backgroundElement" style={styles.row}>
              <View style={styles.flex}>
                <ThemedText translateText={!t.description}>{t.description ?? TRANSACTION_KIND_LABELS[t.kind]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatIsoDate(t.occurred_on, locale)} · <ThemedText type="small" themeColor="textSecondary" translateText={false}>{t.account?.name}</ThemedText> ·{' '}
                  {t.kind === 'transfer'
                    ? translate(locale, "transactions.transfer")
                    : t.splits?.length
                      ? translate(locale, "transactions.splitCount", { count: t.splits.length })
                      : t.category?.name
                        ? <ThemedText type="small" themeColor="textSecondary" translateText={false}>{t.category.name}</ThemedText>
                        : translate(locale, "categories.uncategorized")}
                </ThemedText>
              </View>
              <ThemedText style={t.amount < 0 ? styles.negative : styles.positive}>
                {formatMoney(t.amount, t.currency, locale)}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      ))}
      {query.hasNextPage && (
        <Button title="Cargar más" onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: { flex: 1 },
  negative: { color: '#dc2626' },
  positive: { color: '#15803d' },
});
