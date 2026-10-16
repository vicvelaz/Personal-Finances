import {
  formatMoney,
  minorToInput,
  parsePositiveMoneyInput,
  type BudgetPeriod,
} from '@fin/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, FormAlert, MoneyField, OptionPicker } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type BudgetRow = {
  budget_id: string;
  category_id: string;
  category_name: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
};
type Goal = { id: string; name: string; currency: string };
type Rule = {
  budget_id: string;
  destination: 'reallocation' | 'goal' | 'rollover' | 'expire';
  target_budget_id: string | null;
  savings_goal_id: string | null;
};

export function BudgetClosureAssistant({
  month,
  locale,
  currency,
  budgets,
  goals,
  rules,
  closed,
  settledByBudget,
  onChanged,
}: {
  month: string;
  locale: string;
  currency: string;
  budgets: BudgetRow[];
  goals: Goal[];
  rules: Rule[];
  closed: string[];
  settledByBudget: Map<string, number>;
  onChanged: () => void;
}) {
  const pending = budgets
    .filter((budget) => budget.period === 'monthly' && !closed.includes(budget.budget_id))
    .map((budget) => ({
      ...budget,
      remaining: budget.amount - budget.spent - (settledByBudget.get(budget.budget_id) ?? 0),
    }));
  if (pending.length === 0) return null;
  const targets = budgets.filter((budget) => budget.period !== 'annual' && budget.spent > budget.amount);

  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 12, padding: 12, gap: 12 }}>
      <ThemedText type="smallBold">Cierre de {month}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Distribuye el remanente virtual; estas operaciones no crean movimientos bancarios.
      </ThemedText>
      {pending.map((budget) => (
        <ClosureBudget
          key={budget.budget_id}
          budget={budget}
          month={month}
          locale={locale}
          currency={currency}
          goals={goals}
          targets={targets.filter((target) => target.category_id !== budget.category_id)}
          rule={rules.find((rule) => rule.budget_id === budget.budget_id)}
          onChanged={onChanged}
        />
      ))}
    </ThemedView>
  );
}

function ClosureBudget({
  budget,
  month,
  locale,
  currency,
  goals,
  targets,
  rule,
  onChanged,
}: {
  budget: BudgetRow & { remaining: number };
  month: string;
  locale: string;
  currency: string;
  goals: Goal[];
  targets: BudgetRow[];
  rule?: Rule;
  onChanged: () => void;
}) {
  const { session } = useSession();
  const [destination, setDestination] = useState(() => ruleValue(rule));
  const [amount, setAmount] = useState(minorToInput(Math.max(budget.remaining, 0), locale));
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const pendingKey = useRef<string | null>(null);
  const money = (value: number) => formatMoney(value, currency, locale);
  const [type, targetId, goalId] = destination.split(':');
  const options = [
    ...goals.map((goal) => `goal:${goal.id}`),
    ...targets.map((target) => `reallocation:${target.budget_id}`),
    `rollover:${budget.budget_id}`,
    'expire',
  ];
  const labels = Object.fromEntries([
    ...goals.map((goal) => [`goal:${goal.id}`, `Meta: ${goal.name}`]),
    ...targets.map((target) => [`reallocation:${target.budget_id}`, `Categoría: ${target.category_name}`]),
    [`rollover:${budget.budget_id}`, 'Mes siguiente'],
    ['expire', 'Expirar (reset)'],
  ]);

  async function applySettlement() {
    setError(undefined);
    const parsedAmount = parsePositiveMoneyInput(amount);
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > budget.remaining) {
      setError(`Introduce un importe positivo de hasta ${money(Math.max(budget.remaining, 0))}.`);
      return;
    }
    if (!pendingKey.current) pendingKey.current = createIdempotencyKey();
    const { error: rpcError } = await supabase.rpc('apply_budget_settlement', {
      p_budget_id: budget.budget_id,
      p_period_start: `${month}-01`,
      p_destination: type,
      p_amount: parsedAmount,
      p_idempotency_key: pendingKey.current,
      p_target_budget_id: type === 'reallocation' || type === 'rollover' ? targetId : null,
      p_savings_goal_id: type === 'goal' ? goalId : null,
      p_target_period: type === 'reallocation' ? `${month}-01` : type === 'rollover' ? `${nextMonth(month)}-01` : null,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    pendingKey.current = null;
    setMessage('Distribución guardada.');
    onChanged();
  }

  async function completeClosure() {
    setError(undefined);
    const { error: rpcError } = await supabase.rpc('complete_budget_closure', {
      p_budget_id: budget.budget_id,
      p_period_start: `${month}-01`,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMessage('Periodo cerrado.');
    onChanged();
  }

  async function saveRule() {
    setError(undefined);
    if (!session) {
      setError('Inicia sesión para guardar la regla.');
      return;
    }
    const { error: upsertError } = await supabase.from('budget_closure_rules').upsert({
      user_id: session.user.id,
      budget_id: budget.budget_id,
      destination: type,
      target_budget_id: type === 'reallocation' || type === 'rollover' ? targetId : null,
      savings_goal_id: type === 'goal' ? goalId : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,budget_id' });
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setMessage('Regla automática guardada.');
    onChanged();
  }

  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: '#9ca3af', paddingTop: 10 }}>
      <ThemedText type="smallBold" translateText={false}>{budget.category_name}</ThemedText>
      <ThemedText type="small" translateText={false}>
        Presupuesto {money(budget.amount)} · Gastado {money(budget.spent)} · Restante {money(budget.remaining)}
      </ThemedText>
      {budget.remaining > 0 ? (
        <>
          <OptionPicker
            label="Destino"
            options={options}
            labels={labels}
            value={destination}
            onChange={(value) => {
              setDestination(value);
              pendingKey.current = null;
            }}
          />
          <MoneyField label="Importe" value={amount} onChangeText={(value) => {
            setAmount(value);
            pendingKey.current = null;
          }} currency={currency} />
          <Button title="Distribuir" onPress={applySettlement} />
          <Button variant="link" title="Guardar como regla automática" onPress={saveRule} />
        </>
      ) : (
        <Button variant="link" title="Cerrar periodo" onPress={completeClosure} />
      )}
      <FormAlert error={error} message={message} />
    </View>
  );
}

function ruleValue(rule?: Rule): string {
  if (!rule) return 'expire';
  if (rule.destination === 'goal') return `goal:${rule.savings_goal_id}`;
  if (rule.destination === 'reallocation') return `reallocation:${rule.target_budget_id}`;
  if (rule.destination === 'rollover') return `rollover:${rule.target_budget_id}`;
  return 'expire';
}

function nextMonth(month: string): string {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, value!, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function createIdempotencyKey(): string {
  return `manual:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
