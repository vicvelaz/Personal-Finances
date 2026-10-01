import { z } from "zod";
import type { TranslationKey } from "./i18n";

export const CATEGORY_KINDS = ["expense", "income"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, TranslationKey> = {
  expense: "transactions.expenses",
  income: "transactions.incomes",
};

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(1, { error: "El nombre es obligatorio" })
    .max(40, { error: "El nombre no puede superar 40 caracteres" }),
  kind: z.enum(CATEGORY_KINDS, { error: "Tipo no válido" }),
  parentId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid({ error: "Categoría padre no válida" }).nullable()),
  color: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Usa un color #RRGGBB" }).nullable()),
};

export const categoryCreateSchema = z.object(categoryFields);
export const categoryUpdateSchema = z.object(categoryFields);

export type CategoryInput = z.input<typeof categoryCreateSchema>;
export type CategoryValues = z.output<typeof categoryCreateSchema>;

export const CATEGORY_MESSAGES = {
  duplicate: "Ya existe una categoría con ese nombre",
  invalidParent: "La categoría padre debe ser una categoría principal del mismo tipo",
  hasChildren: "La categoría tiene subcategorías. Bórralas o muévelas primero",
  notFound: "La categoría no existe",
  unexpected: "No se pudo guardar la categoría. Inténtalo de nuevo",
} as const;

/** Maps a database error (Postgres code + message) to a field and a user-facing message. */
export function categoryErrorMessage(
  code: string | undefined,
  message: string | undefined,
): { field?: "name" | "parentId" | "kind"; message: string } {
  if (code === "23505") return { field: "name", message: CATEGORY_MESSAGES.duplicate };
  if (message === "category_invalid_parent") return { field: "parentId", message: CATEGORY_MESSAGES.invalidParent };
  if (message === "category_has_children") return { message: CATEGORY_MESSAGES.hasChildren };
  return { message: CATEGORY_MESSAGES.unexpected };
}

export type CategoryRow = {
  id: string;
  name: string;
  kind: CategoryKind;
  parent_id: string | null;
  color: string | null;
};

export type CategoryNode<T extends CategoryRow = CategoryRow> = T & { children: T[] };

/** Groups categories by kind and nests children under their parent, sorted by name. */
export function buildCategoryTree<T extends CategoryRow>(
  rows: readonly T[],
  locale = "es",
): Record<CategoryKind, CategoryNode<T>[]> {
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, locale);
  const tree: Record<CategoryKind, CategoryNode<T>[]> = { expense: [], income: [] };
  const parents = new Map<string, CategoryNode<T>>();
  for (const r of rows) {
    if (r.parent_id === null) {
      const node = { ...r, children: [] as T[] };
      parents.set(r.id, node);
      tree[r.kind].push(node);
    }
  }
  for (const r of rows) {
    if (r.parent_id !== null) parents.get(r.parent_id)?.children.push(r);
  }
  for (const kind of CATEGORY_KINDS) {
    tree[kind].sort(byName);
    for (const n of tree[kind]) n.children.sort(byName);
  }
  return tree;
}
