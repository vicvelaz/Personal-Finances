"use client";

import {
  formatMoney,
  minorToInput,
  parsePositiveMoneyInput,
  type BudgetPeriod,
} from "@fin/shared";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MoneyField } from "@/components/form";
import { createClient } from "@/lib/supabase/client";

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
  destination: "reallocation" | "goal" | "rollover" | "expire";
  target_budget_id: string | null;
  savings_goal_id: string | null;
};

export function ClosureAssistant({
  month,
  locale,
  currency,
  budgets,
  goals,
  rules,
  closed,
  settledByBudget,
}: {
  month: string;
  locale: string;
  currency: string;
  budgets: BudgetRow[];
  goals: Goal[];
  rules: Rule[];
  closed: string[];
  settledByBudget: Map<string, number>;
}) {
  const pending = budgets
    .filter((budget) => budget.period === "monthly" && !closed.includes(budget.budget_id))
    .map((budget) => ({
      ...budget,
      remaining: budget.amount - budget.spent - (settledByBudget.get(budget.budget_id) ?? 0),
    }));
  if (pending.length === 0) return null;
  const targets = budgets.filter((budget) => budget.period !== 'annual' && budget.spent > budget.amount);

  return (
    <section className="flex flex-col gap-3 rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-lg font-semibold">Cierre de {month}</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Distribuye el remanente virtual; estas operaciones no crean movimientos bancarios.
      </p>
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
        />
      ))}
    </section>
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
}: {
  budget: BudgetRow & { remaining: number };
  month: string;
  locale: string;
  currency: string;
  goals: Goal[];
  targets: BudgetRow[];
  rule?: Rule;
}) {
  const router = useRouter();
  const client = createClient();
  const [destination, setDestination] = useState(() => ruleValue(rule));
  const [amount, setAmount] = useState(() => minorToInput(Math.max(budget.remaining, 0), locale));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pendingKey = useRef<string | null>(null);
  const money = (value: number) => formatMoney(value, currency, locale);
  const [type, targetId, goalId] = destination.split(":");

  function changeDestination(value: string) {
    setDestination(value);
    pendingKey.current = null;
    setMessage("");
  }

  function changeAmount(value: string) {
    setAmount(value);
    pendingKey.current = null;
    setMessage("");
  }

  async function applySettlement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsedAmount = parsePositiveMoneyInput(amount);
    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > budget.remaining) {
      setError(`Introduce un importe positivo de hasta ${money(Math.max(budget.remaining, 0))}.`);
      return;
    }
    if (!pendingKey.current) pendingKey.current = createIdempotencyKey();
    const { error: rpcError } = await client.rpc("apply_budget_settlement", {
      p_budget_id: budget.budget_id,
      p_period_start: `${month}-01`,
      p_destination: type,
      p_amount: parsedAmount,
      p_idempotency_key: pendingKey.current,
      p_target_budget_id: type === "reallocation" || type === "rollover" ? targetId : null,
      p_savings_goal_id: type === "goal" ? goalId : null,
      p_target_period: type === "reallocation" ? `${month}-01` : type === "rollover" ? `${nextMonth(month)}-01` : null,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    pendingKey.current = null;
    setMessage("Distribución guardada.");
    router.refresh();
  }

  async function completeClosure() {
    setError("");
    const { error: rpcError } = await client.rpc("complete_budget_closure", {
      p_budget_id: budget.budget_id,
      p_period_start: `${month}-01`,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMessage("Periodo cerrado.");
    router.refresh();
  }

  async function saveRule() {
    setError("");
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) {
      setError(authError?.message ?? "Inicia sesión para guardar la regla.");
      return;
    }
    const { error: upsertError } = await client.from("budget_closure_rules").upsert({
      user_id: auth.user.id,
      budget_id: budget.budget_id,
      destination: type,
      target_budget_id: type === "reallocation" || type === "rollover" ? targetId : null,
      savings_goal_id: type === "goal" ? goalId : null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,budget_id" });
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setMessage("Regla automática guardada.");
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
      <h3 className="font-medium">{budget.category_name}</h3>
      <p className="text-sm">Presupuesto {money(budget.amount)} · Gastado {money(budget.spent)} · Restante {money(budget.remaining)}</p>
      {budget.remaining > 0 ? (
        <>
          <form onSubmit={applySettlement} className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-col gap-1 text-sm">
              Destino
              <select className="form-select" value={destination} onChange={(event) => changeDestination(event.target.value)}>
                {goals.map((goal) => <option key={goal.id} value={`goal:${goal.id}`}>Meta: {goal.name}</option>)}
                {targets.map((target) => <option key={target.budget_id} value={`reallocation:${target.budget_id}`}>Categoría: {target.category_name}</option>)}
                <option value={`rollover:${budget.budget_id}`}>Mes siguiente</option>
                <option value="expire">Expirar (reset)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Importe
              <MoneyField
                id={`settlement-amount-${budget.budget_id}`}
                value={amount}
                onChange={changeAmount}
                label="Importe"
                currency={currency}
                error={error}
                className="form-control w-32"
              />
            </label>
            <button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800" type="submit">Distribuir</button>
          </form>
          <button className="w-fit text-sm underline" type="button" onClick={saveRule}>Guardar como regla automática</button>
        </>
      ) : (
        <button className="w-fit text-sm underline" type="button" onClick={completeClosure}>Cerrar periodo</button>
      )}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-green-800 dark:text-green-300">{message}</p>}
    </article>
  );
}

function ruleValue(rule?: Rule): string {
  if (!rule) return "expire";
  if (rule.destination === "goal") return `goal:${rule.savings_goal_id}`;
  if (rule.destination === "reallocation") return `reallocation:${rule.target_budget_id}`;
  if (rule.destination === "rollover") return `rollover:${rule.target_budget_id}`;
  return "expire";
}

function nextMonth(month: string): string {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, value!, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createIdempotencyKey(): string {
  return `manual:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
