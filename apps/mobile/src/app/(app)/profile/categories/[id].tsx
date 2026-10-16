import { categoryUpdateSchema, type CategoryRow, fieldErrors } from '@fin/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type CategoryFormValues, CategoryFields } from '@/components/category-fields';
import { Button, FormAlert } from '@/components/form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile } from '@/lib/profile';
import { CategoryError, useCategories, useCategoryMutations } from '@/lib/categories';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { budgetStatus, formatMoney, formatMonth, todayInTimeZone } from '@fin/shared';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useCategories();

  if (categories.isPending) return <Screen title="Categoría" />;
  const category = categories.data?.find((c) => c.id === id);
  if (!category) {
    return (
      <Screen titleKey="categories.category">
        <FormAlert error="La categoría no existe" />
        <Button variant="link" title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }
  const parents = (categories.data ?? []).filter((c) => c.parent_id === null);
  return (
    <EditCategoryForm
      key={category.id}
      category={category}
      parents={parents}
      showAnalytics={category.kind === 'expense'}
    />
  );
}

function EditCategoryForm({
  category,
  parents,
  showAnalytics,
}: {
  category: CategoryRow;
  parents: CategoryRow[];
  showAnalytics: boolean;
}) {
  const { update, remove } = useCategoryMutations();
  const profile = useProfile().data;
  const locale = profile?.locale ?? 'es-ES';
  const currency = profile?.base_currency ?? 'EUR';
  const currentMonth = todayInTimeZone(profile?.timezone ?? 'Europe/Madrid').slice(0, 7);
  const history = useQuery({
    queryKey: ['category-budget-history', category.id, currentMonth],
    enabled: showAnalytics,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('category_budget_history', {
        p_category_id: category.id,
        p_through_month: `${currentMonth}-01`,
      });
      if (error) throw error;
      return data as CategoryBudgetHistory[];
    },
  });
  const [values, setValues] = useState<CategoryFormValues>({
    name: category.name,
    kind: category.kind,
    parentId: category.parent_id ?? '',
    color: category.color ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onError = (e: Error) => {
    if (e instanceof CategoryError && e.field) setErrors({ [e.field]: e.message });
  };

  function onSubmit() {
    const parsed = categoryUpdateSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    update.mutate({ id: category.id, values: parsed.data }, { onSuccess: () => router.back(), onError });
  }

  async function onDelete() {
    const ok = await confirm('Borrar categoría', 'Sus movimientos quedarán sin categoría y se borrarán sus presupuestos.', 'Borrar');
    if (ok) remove.mutate(category.id, { onSuccess: () => router.back() });
  }

  const mutationError = update.error ?? remove.error;
  const formError = mutationError instanceof CategoryError && mutationError.field ? undefined : mutationError?.message;
  return (
    <Screen title={category.name} translateTitle={false}>
      <FormAlert error={formError} />
      {showAnalytics && (
        <CategoryBudgetAnalytics
          history={history.data ?? []}
          locale={locale}
          currency={currency}
          currentMonth={currentMonth}
          loading={history.isPending}
          error={history.error ? 'No se pudo cargar el análisis del presupuesto' : undefined}
        />
      )}
      <CategoryFields
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        errors={errors}
        parents={parents}
        selfId={category.id}
      />
      <Button title="Guardar cambios" onPress={onSubmit} loading={update.isPending} />
      <Button variant="link" title="Borrar categoría" onPress={() => !remove.isPending && onDelete()} />
      <Button variant="link" title="Cancelar" onPress={() => router.back()} />
    </Screen>
  );
}

type CategoryBudgetHistory = {
  month_start: string;
  budget_amount: number;
  spent: number;
  reallocated: number;
  goal_sweep: number;
  rollover: number;
  expired: number;
};

function CategoryBudgetAnalytics({
  history,
  locale,
  currency,
  currentMonth,
  loading,
  error,
}: {
  history: CategoryBudgetHistory[];
  locale: string;
  currency: string;
  currentMonth: string;
  loading: boolean;
  error?: string;
}) {
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const current = history.find((item) => item.month_start.slice(0, 7) === currentMonth);
  const status = current && current.budget_amount > 0
    ? budgetStatus(current.budget_amount, current.spent)
    : null;
  const max = Math.max(1, ...history.map((item) => Math.max(item.budget_amount, item.spent)));
  const destinations = [
    ['Metas', 'goal_sweep'],
    ['Otras categorías', 'reallocated'],
    ['Mes siguiente', 'rollover'],
    ['Expirado', 'expired'],
  ] as const;

  return (
    <ThemedView type="backgroundElement" style={styles.analytics}>
      <ThemedText type="smallBold">Análisis del presupuesto</ThemedText>
      {loading ? <ThemedText type="small">Cargando…</ThemedText> : null}
      {error ? <FormAlert error={error} /> : null}
      {status ? (
        <View accessibilityLabel="Estado del presupuesto actual">
          <ThemedText type="small">Presupuesto actual: {money(current!.budget_amount)}</ThemedText>
          <ThemedText type="small">
            Gastado: {money(current!.spent)} · Restante: {money(status.remaining)} · {status.percent}%
          </ThemedText>
          <ThemedText type="small" style={status.level === 'over' ? styles.over : undefined}>
            {status.level === 'over' ? 'Superado' : status.level === 'warning' ? 'En riesgo' : 'Dentro del límite'}
          </ThemedText>
        </View>
      ) : !loading && !error ? (
        <ThemedText type="small">No hay presupuesto activo para este mes.</ThemedText>
      ) : null}
      <ThemedText type="smallBold">Últimos 12 meses</ThemedText>
      {history.map((item) => (
        <View key={item.month_start} style={styles.historyRow} accessibilityLabel={`${formatMonth(item.month_start.slice(0, 7), locale)}: ${money(item.spent)} gastados de ${money(item.budget_amount)}`}>
          <ThemedText type="small">{formatMonth(item.month_start.slice(0, 7), locale)}</ThemedText>
          <View style={styles.bar}>
            <View style={[styles.fill, {
              width: `${Math.min(100, (item.spent / max) * 100)}%`,
              backgroundColor: item.spent > item.budget_amount ? '#dc2626' : '#2563eb',
            }]} />
          </View>
          <ThemedText type="small">{money(item.spent)} / {money(item.budget_amount)}</ThemedText>
        </View>
      ))}
      <ThemedText type="smallBold">Distribución de sobrantes (12 meses)</ThemedText>
      {destinations.map(([label, key]) => {
        const amount = history.reduce((sum, item) => sum + item[key], 0);
        return amount > 0 ? <ThemedText key={key} type="small">{label}: {money(amount)}</ThemedText> : null;
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  analytics: { borderRadius: 12, padding: 12, gap: 8 },
  historyRow: { gap: 3 },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#e5e5e5', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  over: { color: '#dc2626' },
});
