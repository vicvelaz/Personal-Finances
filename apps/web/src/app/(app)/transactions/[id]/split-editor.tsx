"use client";

import { buildCategoryTree, type CategoryRow, formatMoney, splitRemaining } from "@fin/shared";
import { startTransition, useActionState, useState } from "react";
import { FormAlert, MoneyField } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import { removeSplits, saveSplits, type SplitState } from "../actions";
import { T } from "@/components/i18n-provider";

const inputClass = "rounded-md border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700";

type Line = { categoryId: string; amount: string };

export function SplitEditor({
  id,
  kind,
  total,
  currency,
  locale,
  categories,
  initial,
}: {
  id: string;
  kind: "expense" | "income";
  /** Magnitude in minor units. */
  total: number;
  currency: string;
  locale: string;
  categories: CategoryRow[];
  initial: Line[];
}) {
  const { t } = useTranslations();
  const [lines, setLines] = useState<Line[]>(initial.length ? initial : [{ categoryId: "", amount: "" }, { categoryId: "", amount: "" }]);
  const [state, action, pending] = useActionState<SplitState, FormData>(saveSplits.bind(null, id), {});
  const [removeState, remove, removing] = useActionState<SplitState>(removeSplits.bind(null, id), {});
  const tree = buildCategoryTree(categories)[kind];
  const remaining = splitRemaining(total, lines.map((l) => l.amount));
  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <section className="flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800" aria-label={t("Dividir movimiento")}>
      <h2 className="text-lg font-medium"><T id="transactions.splitAcrossCategories" /></h2>
      <FormAlert error={state.error ?? state.errors?._form ?? removeState.error} message={state.message ?? removeState.message} />
      {/* onSubmit instead of action: React's automatic form reset would desync the controlled selects. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
        className="flex flex-col gap-2"
        noValidate
      >
        <input type="hidden" name="lines" value={JSON.stringify(lines)} />
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select aria-label={t("Categoría de la parte {index}", { index: i + 1 })} value={l.categoryId} onChange={(e) => set(i, { categoryId: e.target.value })} className={inputClass}>
              <option value=""><T id="categories.uncategorized" /></option>
              {tree.map((c) => [
                <option key={c.id} value={c.id}>{c.name}</option>,
                ...c.children.map((ch) => (
                  <option key={ch.id} value={ch.id}>{`\u00a0\u00a0\u00a0${ch.name}`}</option>
                )),
              ])}
            </select>
            <MoneyField
              id={`split-amount-${i}`}
              label={t("Importe de la parte {index}", { index: i + 1 })}
              value={l.amount}
              onChange={(value) => set(i, { amount: value })}
              currency={currency}
              error={state.errors?.[`${i}.amount`]}
              className={`${inputClass} w-28`}
            />
            {lines.length > 2 && (
              <button type="button" className="text-sm underline" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <T id="common.remove" />
              </button>
            )}
            {state.errors?.[`${i}.amount`] && <span className="text-sm text-red-600">{t(state.errors[`${i}.amount`]!)}</span>}
          </div>
        ))}
        <p className={`text-sm ${remaining === 0 ? "text-neutral-500" : "text-amber-700"}`}>
          <T id="common.unallocated" /> {formatMoney(remaining, currency, locale)}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="text-sm underline" onClick={() => setLines((ls) => [...ls, { categoryId: "", amount: "" }])}>
            <T id="transactions.addSplit" />
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
            <T id="transactions.saveSplit" />
          </button>
        </div>
      </form>
      {initial.length > 0 && (
        <form action={remove}>
          <button type="submit" disabled={removing} className="text-sm underline"><T id="transactions.removeSplit" /></button>
        </form>
      )}
    </section>
  );
}
