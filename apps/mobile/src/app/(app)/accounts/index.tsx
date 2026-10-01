import { ACCOUNT_TYPE_LABELS, formatMoney, totalsByCurrency, translate } from '@fin/shared';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type AccountRow, useAccounts } from '@/lib/accounts';
import { useProfile } from '@/lib/profile';

export default function AccountsScreen() {
  const accounts = useAccounts();
  const locale = useProfile().data?.locale ?? 'es-ES';

  const rows = accounts.data ?? [];
  const active = rows.filter((r) => !r.is_archived);
  const archived = rows.filter((r) => r.is_archived);
  const totals = totalsByCurrency(
    rows.map((r) => ({ currency: r.currency, balance: r.balance, isArchived: r.is_archived })),
  );

  return (
    <Screen titleKey="accounts.accounts">
      <Button title="Nueva cuenta" onPress={() => router.push('/accounts/new')} />
      {accounts.isError && <FormAlert error="No se pudieron cargar las cuentas" />}
      {accounts.isSuccess && rows.length === 0 && (
        <ThemedText translationKey="accounts.donTAnyAccountsYetCreateFirstAccount" />
      )}
      {totals.length > 0 && (
        <View style={styles.totals} accessibilityLabel={translate(locale, "profile.totalsCurrency")}>
          {totals.map((t) => (
            <ThemedView key={t.currency} type="backgroundElement" style={styles.total}>
              <ThemedText type="small" themeColor="textSecondary">Total {t.currency}</ThemedText>
              <ThemedText type="smallBold">{formatMoney(t.total, t.currency, locale)}</ThemedText>
            </ThemedView>
          ))}
        </View>
      )}
      {active.length > 0 && <AccountList title="Activas" rows={active} locale={locale} />}
      {archived.length > 0 && <AccountList title="Archivadas" rows={archived} locale={locale} />}
    </Screen>
  );
}

function AccountList({ title, rows, locale }: { title: string; rows: AccountRow[]; locale: string }) {
  return (
    <View style={styles.list}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {rows.map((r) => (
        <Link key={r.id} href={{ pathname: '/accounts/[id]', params: { id: r.id } }} asChild>
          <Pressable accessibilityRole="link">
            <ThemedView type="backgroundElement" style={styles.row}>
              <View>
                <ThemedText translateText={false}>{r.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{ACCOUNT_TYPE_LABELS[r.type]}</ThemedText>
              </View>
              <ThemedText style={r.balance < 0 ? styles.negative : undefined}>
                {formatMoney(r.balance, r.currency, locale)}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  total: { borderRadius: Spacing.two, padding: Spacing.two },
  list: { gap: Spacing.two },
  row: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  negative: { color: '#dc2626' },
});
