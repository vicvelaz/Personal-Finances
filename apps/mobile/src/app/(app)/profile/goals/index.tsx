import { formatMoney, GOAL_STATUS_LABELS, GOAL_STATUSES, goalProgress, todayInTimeZone } from '@fin/shared';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGoals } from '@/lib/goals';
import { useProfile } from '@/lib/profile';

export default function GoalsScreen() {
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const today = todayInTimeZone(profile?.timezone ?? 'Europe/Madrid');
  const goals = useGoals();
  const rows = goals.data ?? [];

  return (
    <Screen titleKey="goals.savingsGoals">
      <Button title="Nueva meta" onPress={() => router.push('/profile/goals/new')} />
      {goals.isError && <FormAlert error="No se pudieron cargar las metas" />}
      {goals.isSuccess && rows.length === 0 && (
        <ThemedText translationKey="goals.donTAnySavingsGoalsYet" />
      )}
      {GOAL_STATUSES.map((status) => {
        const list = rows.filter((g) => g.status === status);
        if (list.length === 0) return null;
        return (
          <View key={status} style={styles.group}>
            <ThemedText type="smallBold">{GOAL_STATUS_LABELS[status]}</ThemedText>
            {list.map((g) => {
              const p = goalProgress({ target: g.target_amount, current: g.current_amount, targetDate: g.target_date, today });
              const money = (v: number) => formatMoney(v, g.currency, locale);
              return (
                <Link key={g.id} href={{ pathname: '/profile/goals/[id]', params: { id: g.id } }} asChild>
                  <Pressable accessibilityRole="link">
                    <ThemedView type="backgroundElement" style={styles.item}>
                      <View style={styles.header}>
                        <ThemedText translateText={false}>{g.name}</ThemedText>
                        <ThemedText type="small">{p.percent.toLocaleString(locale)}%</ThemedText>
                      </View>
                      <View style={styles.bar}>
                        <View style={[styles.fill, { width: `${Math.min(p.percent, 100)}%` }]} />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {money(g.current_amount)} de {money(g.target_amount)}
                        {p.monthlyNeeded !== null && p.remaining > 0 ? ` · ${money(p.monthlyNeeded)}/mes` : ''}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        );
      })}
      <Button variant="link" title="Volver" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  item: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#e5e5e5', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
});
