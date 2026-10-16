import {
  BUDGET_MESSAGES,
  BUDGET_PERIODS,
  type BudgetPeriod,
  budgetCreateSchema,
  budgetErrorMessage,
  budgetInsightLines,
  budgetInsights,
  budgetSchema,
  budgetStatus,
  buildCategoryTree,
  fieldErrors,
  formatMoney,
  formatMonth,
  minorToInput,
  monthRange,
  prepareBudgetMonthPlan,
  shiftMonth,
  todayInTimeZone,
  translate,
  translateKey,
} from '@fin/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, FormAlert, OptionPicker, TextField } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/lib/categories';
import { confirm } from '@/lib/confirm';
import { useProfile } from '@/lib/profile';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type Progress = {
  budget_id: string;
  category_id: string;
  category_name: string;
  color: string | null;
  parent_id: string | null;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  base_amount: number;
};

const LEVEL_COLOR = { ok: '#16a34a', warning: '#f59e0b', over: '#dc2626' } as const;

export default function BudgetsScreen() {
  const { session } = useSession();
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const currency = profile?.base_currency ?? 'EUR';
  const today = todayInTimeZone(profile?.timezone ?? 'Europe/Madrid');
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const queryClient = useQueryClient();
  const categories = useCategories();

  const progress = useQuery({
    queryKey: ['budgets', session?.user.id, month],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('budget_progress', { p_month: monthRange(month)!.from });
      if (error) throw error;
      return data as Progress[];
    },
  });
  const yearSpent = useQuery({
    queryKey: ['budgets', session?.user.id, 'year-spent', today.slice(0, 4)],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('budget_year_spent', { p_year: `${today.slice(0, 4)}-01-01` });
      if (error) throw error;
      return new Map((data as { budget_id: string; spent: number }[]).map((r) => [r.budget_id, r.spent]));
    },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['budgets'] });

  const copy = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('copy_budgets', {
        p_from: monthRange(shiftMonth(month, -1))!.from,
        p_to: monthRange(month)!.from,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const rows = progress.data ?? [];
  const budgeted = new Set(rows.map((r) => r.category_id));
  const available = buildCategoryTree(categories.data ?? [])
    .expense.flatMap((c) => [c, ...c.children])
    .filter((c) => !budgeted.has(c.id));

  return (
    <Screen titleKey="budgets.budgets">
      <View style={styles.monthNav}>
        <Button variant="link" title="←" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
        <ThemedText type="smallBold">{formatMonth(month, locale)}</ThemedText>
        <Button variant="link" title="→" onPress={() => setMonth((m) => shiftMonth(m, 1))} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {translate(locale, BUDGET_MESSAGES.baseCurrencyOnly)} ({currency}).
      </ThemedText>
      {progress.isError && <FormAlert error="No se pudieron cargar los presupuestos" />}
      {progress.isSuccess && rows.length === 0 && (
        <ThemedText translationKey="dashboard.budgetsMonth" />
      )}
      {rows.map((r) => (
        <BudgetItem
          key={r.budget_id}
          row={r}
          locale={locale}
          currency={currency}
          today={today}
          inCurrentYear={month.slice(0, 4) === today.slice(0, 4)}
          yearSpent={yearSpent.data?.get(r.budget_id) ?? 0}
          onChanged={invalidate}
        />
      ))}
      <NewBudget
        month={month}
        options={available.map((c) => c.id)}
        labels={Object.fromEntries(available.map((c) => [c.id, c.parent_id ? `· ${c.name}` : c.name]))}
        onCreated={invalidate}
      />
      <Button variant="link" title="Copiar presupuestos del mes anterior" onPress={() => copy.mutate()} />
    </Screen>
  );
}

function BudgetItem({
  row,
  locale,
  currency,
  today,
  inCurrentYear,
  yearSpent,
  onChanged,
}: {
  row: Progress;
  locale: string;
  currency: string;
  today: string;
  inCurrentYear: boolean;
  yearSpent: number;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState(minorToInput(row.period === 'monthly' ? row.base_amount : row.amount, locale));
  const [error, setError] = useState<string>();
  const [planMonth, setPlanMonth] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planError, setPlanError] = useState<string>();
  const [planSaved, setPlanSaved] = useState(false);
  const { session } = useSession();
  const s = budgetStatus(row.amount, row.spent);
  const money = (v: number) => formatMoney(v, currency, locale);
  const insights = inCurrentYear
    ? budgetInsights({ period: row.period, baseAmount: row.base_amount, yearSpent, today })
    : null;
  const details = insights ? budgetInsightLines(locale, row.period, insights, currency) : [];

  const plan = useMutation({
    mutationFn: async () => {
      const parsed = budgetSchema.pick({ amount: true }).safeParse({ amount: planAmount });
      if (!parsed.success || !monthRange(planMonth)) {
        throw new Error(parsed.success ? 'Mes no válido' : fieldErrors(parsed.error).amount);
      }
      const result = prepareBudgetMonthPlan({
        monthlyLimit: row.base_amount,
        currentMonth: today.slice(0, 7),
        targetMonth: planMonth,
        targetLimit: parsed.data.amount,
      });
      if (!result.ok) {
        throw new Error(
          result.reason === 'invalid_month'
            ? 'Elige un mes futuro de este año'
            : result.reason === 'invalid_amount'
              ? BUDGET_MESSAGES.invalidAmount
              : `El aumento excede el límite anual en ${money(result.uncovered)}`,
        );
      }
      const { error } = await supabase.from('budget_month_plans').upsert(
        result.rows.map((r) => ({
          user_id: session!.user.id,
          budget_id: row.budget_id,
          period_start: monthRange(r.month)!.from,
          amount: r.amount,
        })),
        { onConflict: 'budget_id,period_start' },
      );
      if (error) throw new Error(budgetErrorMessage(error.code, error.message).message);
    },
    onSuccess: () => {
      setPlanError(undefined);
      setPlanSaved(true);
      onChanged();
    },
    onError: (e) => {
      setPlanSaved(false);
      setPlanError(e.message);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = budgetSchema.pick({ amount: true }).safeParse({ amount });
      if (!parsed.success) throw new Error(fieldErrors(parsed.error).amount);
      const { error } = await supabase
        .from('budgets')
        .update({ amount: parsed.data.amount, updated_at: new Date().toISOString() })
        .eq('id', row.budget_id);
      if (error) throw new Error(budgetErrorMessage(error.code, error.message).message);
    },
    onSuccess: () => {
      setError(undefined);
      onChanged();
    },
    onError: (e) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('budgets').delete().eq('id', row.budget_id);
      if (error) throw error;
    },
    onSuccess: onChanged,
  });

  return (
    <ThemedView type="backgroundElement" style={styles.item} accessibilityLabel={`Presupuesto ${row.category_name}`}>
      <View style={styles.itemHeader}>
        <ThemedText translateText={false}>
          {row.parent_id ? `↳ ${row.category_name}` : row.category_name}
          {row.period !== 'once' ? ` · ${translateKey(locale, row.period === 'monthly' ? 'budgets.periodMonthly' : 'budgets.periodAnnual')}` : ''}
        </ThemedText>
        <ThemedText type="small">
          {money(row.spent)} de {money(row.amount)} · {s.percent}%
        </ThemedText>
      </View>
      <View style={styles.bar}>
        <View
          style={[styles.fill, { width: `${Math.min(s.percent, 100)}%`, backgroundColor: LEVEL_COLOR[s.level] }]}
        />
      </View>
      <ThemedText type="small" style={s.level === 'over' ? styles.over : undefined} themeColor="textSecondary">
        {s.level === 'over' ? `${translate(locale, "common.exceeded")} · ` : s.level === 'warning' ? `${translate(locale, "budgets.risk")} · ` : ''}
        {translate(locale, "budgets.remaining")} {money(s.remaining)}
      </ThemedText>
      <TextField label={`Importe de ${row.category_name}`} value={amount} onChangeText={setAmount} error={error} keyboardType="numbers-and-punctuation" />
      {details.map((line) => (
        <ThemedText key={line} type="small" themeColor="textSecondary" translateText={false}>
          {line}
        </ThemedText>
      ))}
      {row.period === 'monthly' && inCurrentYear && (
        <View style={styles.newBudget}>
          <TextField label="Mes a planificar (AAAA-MM)" value={planMonth} onChangeText={setPlanMonth} placeholder="2026-12" autoCapitalize="none" />
          <TextField label="Límite del mes a planificar" value={planAmount} onChangeText={setPlanAmount} keyboardType="numbers-and-punctuation" />
          <FormAlert error={planError} message={planSaved ? 'Plan guardado' : undefined} />
          <Button variant="link" title="Planificar mes" onPress={() => plan.mutate()} />
        </View>
      )}
      <View style={styles.actions}>
        <Button variant="link" title="Guardar" onPress={() => save.mutate()} />
        <Button
          variant="link"
          title="Borrar"
          onPress={async () => {
            if (await confirm('Borrar presupuesto', row.category_name, 'Borrar', false)) remove.mutate();
          }}
        />
      </View>
    </ThemedView>
  );
}

function NewBudget({
  month,
  options,
  labels,
  onCreated,
}: {
  month: string;
  options: string[];
  labels: Record<string, string>;
  onCreated: () => void;
}) {
  const { session } = useSession();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('once');
  const [endMonth, setEndMonth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const parsed = budgetCreateSchema.safeParse({ categoryId, month, amount, period, endMonth });
      if (!parsed.success) {
        setErrors(fieldErrors(parsed.error));
        return false;
      }
      const { error } = await supabase.from('budgets').insert({
        user_id: session!.user.id,
        category_id: parsed.data.categoryId,
        period_start: monthRange(month)!.from,
        period: parsed.data.period,
        period_end: parsed.data.endMonth ? monthRange(parsed.data.endMonth)!.to : null,
        amount: parsed.data.amount,
      });
      if (error) {
        const mapped = budgetErrorMessage(error.code, error.message);
        setErrors({ [mapped.field ?? 'amount']: mapped.message });
        return false;
      }
      return true;
    },
    onSuccess: (ok) => {
      if (!ok) return;
      setErrors({});
      setCategoryId('');
      setAmount('');
      setEndMonth('');
      onCreated();
    },
  });

  if (options.length === 0) return null;
  return (
    <View style={styles.newBudget}>
      <ThemedText translationKey="budgets.newBudget" />
      <OptionPicker label="Categoría" options={options} labels={labels} value={categoryId} onChange={setCategoryId} error={errors.categoryId} />
      <OptionPicker
        labelKey="budgets.periodLabel"
        options={BUDGET_PERIODS}
        labels={{ once: 'budgets.periodOnce', monthly: 'budgets.periodMonthly', annual: 'budgets.periodAnnual' }}
        translateLabels
        value={period}
        onChange={setPeriod}
      />
      {period !== 'once' && (
        <TextField labelKey="budgets.endMonthOptional" value={endMonth} onChangeText={setEndMonth} error={errors.endMonth} placeholder="2026-12" autoCapitalize="none" />
      )}
      <TextField label="Importe" value={amount} onChangeText={setAmount} error={errors.amount} keyboardType="numbers-and-punctuation" placeholder="0,00" />
      <Button title="Añadir presupuesto" onPress={() => create.mutate()} loading={create.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#e5e5e5', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  over: { color: '#dc2626' },
  actions: { flexDirection: 'row', gap: Spacing.four },
  newBudget: { gap: Spacing.two },
});
