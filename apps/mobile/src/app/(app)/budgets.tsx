import {
  BUDGET_MESSAGES,
  budgetErrorMessage,
  budgetSchema,
  budgetStatus,
  buildCategoryTree,
  fieldErrors,
  formatMoney,
  formatMonth,
  minorToInput,
  monthRange,
  shiftMonth,
  todayInTimeZone,
  translate,
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
};

const LEVEL_COLOR = { ok: '#16a34a', warning: '#f59e0b', over: '#dc2626' } as const;

export default function BudgetsScreen() {
  const { session } = useSession();
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const currency = profile?.base_currency ?? 'EUR';
  const [month, setMonth] = useState(() => todayInTimeZone(profile?.timezone ?? 'Europe/Madrid').slice(0, 7));
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
        <BudgetItem key={r.budget_id} row={r} locale={locale} currency={currency} onChanged={invalidate} />
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
  onChanged,
}: {
  row: Progress;
  locale: string;
  currency: string;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState(minorToInput(row.amount, locale));
  const [error, setError] = useState<string>();
  const s = budgetStatus(row.amount, row.spent);
  const money = (v: number) => formatMoney(v, currency, locale);

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
        <ThemedText translateText={false}>{row.parent_id ? `↳ ${row.category_name}` : row.category_name}</ThemedText>
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: async () => {
      const parsed = budgetSchema.safeParse({ categoryId, month, amount });
      if (!parsed.success) {
        setErrors(fieldErrors(parsed.error));
        return false;
      }
      const { error } = await supabase.from('budgets').insert({
        user_id: session!.user.id,
        category_id: parsed.data.categoryId,
        period_start: monthRange(month)!.from,
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
      onCreated();
    },
  });

  if (options.length === 0) return null;
  return (
    <View style={styles.newBudget}>
      <ThemedText translationKey="budgets.newBudget" />
      <OptionPicker label="Categoría" options={options} labels={labels} value={categoryId} onChange={setCategoryId} error={errors.categoryId} />
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
