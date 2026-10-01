import type { Minor } from "./money";

export type CategoryTotal = { category_id: string | null; name: string | null; color: string | null; total: Minor };
export type CategorySlice = { id: string; name: string; color: string; total: Minor };

const UNCATEGORISED = { name: "Sin categoría", color: "#94a3b8" };
const OTHER = { id: "other", name: "Otros", color: "#cbd5e1" };

/** Keeps the `n` largest categories and folds the rest into "Otros". */
export function groupTopCategories(rows: readonly CategoryTotal[], n = 6): CategorySlice[] {
  const sorted = [...rows]
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      id: r.category_id ?? "none",
      name: r.category_id ? (r.name ?? "") : UNCATEGORISED.name,
      color: r.color ?? UNCATEGORISED.color,
      total: r.total,
    }));
  if (sorted.length <= n) return sorted;
  const rest = sorted.slice(n).reduce((sum, r) => sum + r.total, 0);
  return [...sorted.slice(0, n), { ...OTHER, total: rest }];
}

export function netSavings(income: Minor, expense: Minor): Minor {
  return income - expense;
}
