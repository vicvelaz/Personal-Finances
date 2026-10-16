"use client";

import { type BudgetLevel, type CategoryRow } from "@fin/shared";
import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import { type BudgetFormState, createBudget, deleteBudget, planBudgetMonth, updateBudget } from "./actions";
import { T } from "@/components/i18n-provider";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700";
const barColor: Record<BudgetLevel, string> = { ok: "bg-green-600", warning: "bg-amber-500", over: "bg-red-600" };

export function NewBudgetForm({ month, categories }: { month: string; categories: CategoryRow[] }) {
  const [state, action] = useActionState<BudgetFormState, FormData>(createBudget, {});
  const { t, tKey } = useTranslations();
  return (
    <form action={action} className="flex flex-wrap items-end gap-3" aria-label={t("Nuevo presupuesto")} noValidate>
      <label className="flex flex-col text-xs">
        {tKey("budgets.startMonth")}
        <input type="month" name="month" defaultValue={month} className={inputClass} />
      </label>
      <label className="flex flex-col text-xs">
        {tKey("budgets.periodLabel")}
        <select name="period" className={inputClass} defaultValue="once">
          <option value="once">{tKey("budgets.periodOnce")}</option>
          <option value="monthly">{tKey("budgets.periodMonthly")}</option>
          <option value="annual">{tKey("budgets.periodAnnual")}</option>
        </select>
      </label>
      <label className="flex flex-col text-xs">
        {tKey("budgets.endMonthOptional")}
        <input type="month" name="endMonth" className={inputClass} />
        {state.errors?.endMonth && <span className="text-red-600">{t(state.errors.endMonth)}</span>}
      </label>
      <label className="flex flex-col text-xs">
        <T id="categories.category" />
        <select name="categoryId" className={inputClass} defaultValue="">
          <option value=""><T id="common.selectOption" /></option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.parent_id ? `\u00a0\u00a0\u00a0${c.name}` : c.name}</option>
          ))}
        </select>
        {state.errors?.categoryId && <span className="text-red-600">{t(state.errors.categoryId)}</span>}
      </label>
      <label className="flex flex-col text-xs">
        <T id="csvImport.amount" />
        <input name="amount" className={inputClass} placeholder={t("0,00")} />
        {state.errors?.amount && <span className="text-red-600">{t(state.errors.amount)}</span>}
      </label>
      <SubmitButton><T id="budgets.addBudget" /></SubmitButton>
      <FormAlert error={state.error} />
    </form>
  );
}

export function BudgetRow({
  id,
  name,
  color,
  isChild,
  amountInput,
  amountLabel,
  spentLabel,
  remainingLabel,
  percent,
  level,
  periodLabel,
  details = [],
  planable = false,
}: {
  id: string;
  name: string;
  color: string | null;
  isChild: boolean;
  amountInput: string;
  amountLabel: string;
  spentLabel: string;
  remainingLabel: string;
  percent: number;
  level: BudgetLevel;
  periodLabel?: string;
  details?: string[];
  planable?: boolean;
}) {
  const [state, action] = useActionState<BudgetFormState, FormData>(updateBudget.bind(null, id), {});
  const [planState, planAction] = useActionState<BudgetFormState, FormData>(planBudgetMonth.bind(null, id), {});
  const { t, tKey } = useTranslations();
  return (
    <li className="flex flex-col gap-2 py-3" aria-label={t("Presupuesto {name}", { name })}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-medium">
          <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: color ?? "#94a3b8" }} />
          {isChild ? `↳ ${name}` : name}
          {periodLabel && <span className="rounded bg-neutral-100 px-1.5 text-xs font-normal dark:bg-neutral-800">{periodLabel}</span>}
        </span>
        <span className="text-sm">
          {spentLabel} <T id="common.of" /> {amountLabel} <T>·</T> <span className={level === "over" ? "text-red-600" : ""}>{percent}<T>%</T></span>
        </span>
      </div>
      <div className="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-2 rounded ${barColor[level]}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={level === "over" ? "text-red-600" : "text-neutral-500"}>
          {level === "over" ? <><T id="common.exceeded" /> <T>·</T> </> : level === "warning" ? <><T id="budgets.risk" /> <T>·</T> </> : null}<T id="budgets.remaining" /> {remainingLabel}
        </span>
        <form action={action} className="flex items-center gap-2" noValidate>
          <input name="amount" defaultValue={amountInput} aria-label={t("Importe de {name}", { name })} className={`${inputClass} w-24`} />
          <button type="submit" className="underline"><T id="common.save" /></button>
          <button type="button" className="text-red-700 underline" onClick={() => deleteBudget(id)}><T id="common.delete" /></button>
          {state.errors?.amount && <span className="text-red-600">{t(state.errors.amount)}</span>}
        </form>
      </div>
      {details.length > 0 && (
        <ul className="text-xs text-neutral-500">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {planable && (
        <form action={planAction} className="flex flex-wrap items-end gap-2 text-xs" noValidate>
          <label className="flex flex-col">
            {tKey("budgets.startMonth")}
            <input type="month" name="targetMonth" className={inputClass} aria-label={t("Mes a planificar")} />
          </label>
          <label className="flex flex-col">
            {tKey("csvImport.amount")}
            <input name="amount" className={`${inputClass} w-24`} aria-label={t("Límite del mes a planificar")} />
          </label>
          <button type="submit" className="underline">{t("Planificar mes")}</button>
          <FormAlert error={planState.error} message={planState.ok ? t("Plan guardado") : undefined} />
          {planState.errors?.targetMonth && <span className="text-red-600">{t(planState.errors.targetMonth)}</span>}
          {planState.errors?.amount && <span className="text-red-600">{t(planState.errors.amount)}</span>}
        </form>
      )}
    </li>
  );
}
