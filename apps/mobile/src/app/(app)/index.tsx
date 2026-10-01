import {
  budgetStatus,
  type CategoryTotal,
  formatMoney,
  formatMonth,
  goalProgress,
  groupTopCategories,
  monthRange,
  netSavings,
  shiftMonth,
  todayInTimeZone,
  totalsByCurrency,
  translate,
} from '@fin/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAccounts } from '@/lib/accounts';
import { useGoals } from '@/lib/goals';
import { useProfile } from '@/lib/profile';
import { useScheduled } from '@/lib/scheduled';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type MonthTotal = { month: string; income: number; expense: number };
type Progress = { budget_id: string; category_name: string; amount: number; spent: number };

export default function HomeScreen() {
  const { session } = useSession();
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const currency = profile?.base_currency ?? 'EUR';
  const today = todayInTimeZone(profile?.timezone ?? 'Europe/Madrid');
  const [month, setMonth] = useState(today.slice(0, 7));
  const range = monthRange(month)!;

  const report = useQuery({
    queryKey: ['dashboard', session?.user.id, month],
    enabled: !!session,
    queryFn: async () => {
      const [totals, categories, budgets, worth] = await Promise.all([
        supabase.rpc('monthly_totals', { p_from: monthRange(shiftMonth(month, -5))!.from, p_to: range.to }),
        supabase.rpc('expenses_by_category', { p_from: range.from, p_to: range.to }),
        supabase.rpc('budget_progress', { p_month: range.from }),
        supabase.rpc('net_worth').maybeSingle<{ total: number; currency: string; missing: string[] }>(),
      ]);
      const error = totals.error ?? categories.error ?? budgets.error ?? worth.error;
      if (error) throw error;
      return {
        trend: totals.data as MonthTotal[],
        categories: categories.data as CategoryTotal[],
        budgets: budgets.data as Progress[],
        worth: worth.data,
      };
    },
  });
  const accounts = useAccounts();
  const scheduled = useScheduled();
  const goals = useGoals();

  const trend = report.data?.trend ?? [];
  const current = trend.at(-1) ?? { income: 0, expense: 0 };
  const money = (v: number) => formatMoney(v, currency, locale);
  const slices = groupTopCategories(report.data?.categories ?? []);
  const maxSlice = Math.max(1, ...slices.map((s) => s.total));
  const maxTrend = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  const alerts = (report.data?.budgets ?? [])
    .map((b) => ({ ...b, status: budgetStatus(b.amount, b.spent) }))
    .filter((b) => b.status.level !== 'ok');
  const dueCount = (scheduled.data ?? []).filter((s) => s.is_active && s.next_run_on <= today).length;
  const balances = totalsByCurrency(
    (accounts.data ?? []).map((a) => ({ currency: a.currency, balance: a.balance, isArchived: a.is_archived })),
  );
  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active');

  return (
    <Screen titleKey="dashboard.overview">
      <View style={styles.row}>
        <Button variant="link" title="←" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
        <ThemedText type="smallBold">{formatMonth(month, locale)}</ThemedText>
        <Button variant="link" title="→" onPress={() => setMonth((m) => shiftMonth(m, 1))} />
      </View>
      {report.isError && <FormAlert error="No se pudo cargar el resumen" />}

      <View style={styles.stats} accessibilityLabel={translate(locale, "dashboard.monthlySummary")}>
        <Stat label="Ingresos" value={money(current.income)} color="#15803d" />
        <Stat label="Gastos" value={money(current.expense)} color="#dc2626" />
        <Stat label="Ahorro neto" value={money(netSavings(current.income, current.expense))} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">Importes convertidos a {currency}, sin transferencias.</ThemedText>

      {dueCount > 0 && (
        <Button
          variant="link"
          title={dueCount === 1 ? '1 movimiento programado pendiente' : `${dueCount} movimientos programados pendientes`}
          onPress={() => router.push('/profile/scheduled')}
        />
      )}
      {alerts.map((b) => (
        <Button
          key={b.budget_id}
          variant="link"
          title={translate(locale, "categories.categoryStatusPercent", {
            category: b.category_name,
            status: translate(locale, b.status.level === 'over' ? "budgets.budgetExceeded" : "budgets.budgetRisk"),
            percent: b.status.percent,
          })}
          onPress={() => router.push('/budgets')}
        />
      ))}

      <ThemedText translationKey="dashboard.spendingCategory" />
      {slices.length === 0 && <ThemedText translationKey="dashboard.spendingMonth" />}
      {slices.map((s) => (
        <View key={s.id} style={styles.slice} accessibilityLabel={translate(locale, '{category} {amount}', { category: s.name, amount: money(s.total) })}>
          <View style={styles.sliceHeader}>
            <ThemedText type="small" translateText={false}>{s.name}</ThemedText>
            <ThemedText type="small">{money(s.total)}</ThemedText>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(s.total / maxSlice) * 100}%`, backgroundColor: s.color }]} />
          </View>
        </View>
      ))}

      <ThemedText translationKey="dashboard.last6Months" />
      <View style={styles.trend}>
        {trend.map((t) => (
          <View key={t.month} style={styles.trendCol} accessibilityLabel={translate(locale, "dashboard.monthIncomeIncomeExpensesExpense", { month: t.month, income: money(t.income), expense: money(t.expense) })}>
            <View style={styles.trendBars}>
              <View style={[styles.trendBar, { height: `${(t.income / maxTrend) * 100}%`, backgroundColor: '#16a34a' }]} />
              <View style={[styles.trendBar, { height: `${(t.expense / maxTrend) * 100}%`, backgroundColor: '#dc2626' }]} />
            </View>
            <ThemedText type="small">{formatMonth(t.month.slice(0, 7), locale).slice(0, 3)}</ThemedText>
          </View>
        ))}
      </View>

      <ThemedText translationKey="dashboard.balanceCurrency" />
      {report.data?.worth && balances.length > 0 && (
        <View accessibilityLabel={translate(locale, "dashboard.netWorth")}>
          <Stat label="Patrimonio" value={formatMoney(report.data.worth.total, report.data.worth.currency, locale)} />
          {report.data.worth.missing.length > 0 && (
            <ThemedText type="small" style={{ color: '#b45309' }}>
              Sin tipo de cambio para: {report.data.worth.missing.join(', ')}
            </ThemedText>
          )}
        </View>
      )}
      <View style={styles.stats}>
        {balances.map((b) => (
          <Stat key={b.currency} label={b.currency} value={formatMoney(b.total, b.currency, locale)} />
        ))}
      </View>

      <ThemedText translationKey="goals.savingsGoals" />
      {activeGoals.length === 0 && (
        <Button variant="link" title="Crea una meta" onPress={() => router.push('/profile/goals/new')} />
      )}
      {activeGoals.map((g) => {
        const p = goalProgress({ target: g.target_amount, current: g.current_amount, targetDate: g.target_date, today });
        return (
          <View key={g.id} style={styles.slice}>
            <View style={styles.sliceHeader}>
              <ThemedText type="small" translateText={false}>{g.name}</ThemedText>
              <ThemedText type="small">{p.percent.toLocaleString(locale)}%</ThemedText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(p.percent, 100)}%`, backgroundColor: '#2563eb' }]} />
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" style={color ? { color } : undefined}>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: { borderRadius: Spacing.two, padding: Spacing.three, minWidth: 100, flexGrow: 1 },
  slice: { gap: Spacing.one },
  sliceHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#e5e5e5', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  trend: { flexDirection: 'row', justifyContent: 'space-between', height: 140, gap: Spacing.one },
  trendCol: { flex: 1, alignItems: 'center', gap: Spacing.one },
  trendBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  trendBar: { width: 10, borderRadius: 2 },
});
