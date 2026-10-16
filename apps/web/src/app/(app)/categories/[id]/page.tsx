import type { CategoryRow } from "@fin/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfilePrefs } from "@/lib/profile";
import { formatMoney, formatMonth, budgetStatus, todayInTimeZone } from "@fin/shared";
import { updateCategory } from "../actions";
import { CategoryForm } from "../category-form";
import { DeleteCategory } from "./delete-category";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("categories.editCategory") };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCategoryPage({ params }: PageProps<"/categories/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { locale, timezone, baseCurrency } = await getProfilePrefs();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("categories")
    .select("id, name, kind, parent_id, color")
    .order("name")
    .returns<CategoryRow[]>();
  // RLS hides other users' categories, so they are indistinguishable from missing ones.
  const category = rows?.find((r) => r.id === id);
  if (!category) notFound();
  const parents = (rows ?? []).filter((r) => r.parent_id === null);
  const throughMonth = todayInTimeZone(timezone).slice(0, 7);
  const { data: historyData, error: historyError } = category.kind === "expense"
    ? await supabase.rpc("category_budget_history", {
        p_category_id: category.id,
        p_through_month: `${throughMonth}-01`,
      })
    : { data: [], error: null };
  if (historyError) throw new Error("No se pudo cargar el análisis del presupuesto");
  const history = (historyData ?? []) as CategoryBudgetHistory[];

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      {category.kind === "expense" && (
        <CategoryBudgetAnalytics
          history={history}
          locale={locale}
          currency={baseCurrency}
          currentMonth={throughMonth}
        />
      )}
      <CategoryForm
        action={updateCategory.bind(null, id)}
        initial={{
          name: category.name,
          kind: category.kind,
          parentId: category.parent_id ?? "",
          color: category.color ?? "",
        }}
        parents={parents}
        selfId={id}
        submitLabel="Guardar cambios"
      />
      <DeleteCategory id={id} />
    </section>
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
}: {
  history: CategoryBudgetHistory[];
  locale: string;
  currency: string;
  currentMonth: string;
}) {
  const money = (amount: number) => formatMoney(amount, currency, locale);
  const current = history.find((item) => item.month_start.slice(0, 7) === currentMonth);
  const status = current && current.budget_amount > 0
    ? budgetStatus(current.budget_amount, current.spent)
    : null;
  const max = Math.max(1, ...history.map((item) => Math.max(item.budget_amount, item.spent)));
  const destinations = [
    ["Metas", "goal_sweep"],
    ["Otras categorías", "reallocated"],
    ["Mes siguiente", "rollover"],
    ["Expirado", "expired"],
  ] as const;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-neutral-300 p-4 dark:border-neutral-700" aria-labelledby="category-budget-title">
      <h2 id="category-budget-title" className="text-lg font-semibold">Análisis del presupuesto</h2>
      {status ? (
        <div className="text-sm" aria-label="Estado del presupuesto actual">
          <p>Presupuesto actual: {money(current!.budget_amount)}</p>
          <p>Gastado: {money(current!.spent)} · Restante: {money(status.remaining)} · {status.percent}%</p>
          <p className={status.level === "over" ? "font-medium text-red-700 dark:text-red-300" : status.level === "warning" ? "font-medium text-amber-800 dark:text-amber-300" : "text-green-800 dark:text-green-300"}>
            {status.level === "over" ? "Superado" : status.level === "warning" ? "En riesgo" : "Dentro del límite"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">No hay presupuesto activo para este mes.</p>
      )}
      <h3 className="font-medium">Últimos 12 meses</h3>
      <ol className="flex flex-col gap-2">
        {history.map((item) => (
          <li key={item.month_start} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-xs">
            <span>{formatMonth(item.month_start.slice(0, 7), locale)}</span>
            <span className="flex flex-col gap-1">
              <span className="sr-only">Gastado {money(item.spent)} de {money(item.budget_amount)}</span>
              <span className="h-2 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700" role="img" aria-label={`${money(item.spent)} gastados; límite ${money(item.budget_amount)}`}>
                <span className={`block h-full ${item.spent > item.budget_amount ? "bg-red-600" : "bg-blue-600"}`} style={{ width: `${Math.min(100, (item.spent / max) * 100)}%` }} />
              </span>
              <span>{money(item.spent)} / {money(item.budget_amount)}</span>
            </span>
          </li>
        ))}
      </ol>
      <h3 className="font-medium">Distribución de sobrantes (12 meses)</h3>
      <ul className="text-sm">
        {destinations.map(([label, key]) => {
          const amount = history.reduce((sum, item) => sum + item[key], 0);
          return amount > 0 ? <li key={key}>{label}: {money(amount)}</li> : null;
        })}
      </ul>
    </section>
  );
}
