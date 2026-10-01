import { buildCategoryTree, CATEGORY_KIND_LABELS, CATEGORY_KINDS, type CategoryRow } from "@fin/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("common.categories") };
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind, parent_id, color")
    .returns<CategoryRow[]>();
  if (error) throw new Error("No se pudieron cargar las categorías");
  const tree = buildCategoryTree(data ?? []);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold"><T id="common.categories" /></h1>
        <Link href="/categories/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <T id="categories.newCategory" />
        </Link>
      </div>
      {CATEGORY_KINDS.map((kind) => (
        <div key={kind}>
          <h2 className="mb-2 text-lg font-medium"><T>{CATEGORY_KIND_LABELS[kind]}</T></h2>
          {tree[kind].length === 0 ? (
            <p className="text-sm text-neutral-500"><T id="categories.emptyState" /></p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {tree[kind].map((c) => (
                <li key={c.id}>
                  <CategoryLink category={c} />
                  {c.children.length > 0 && (
                    <ul>
                      {c.children.map((child) => (
                        <li key={child.id} className="pl-8">
                          <CategoryLink category={child} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

function CategoryLink({ category }: { category: CategoryRow }) {
  return (
    <Link href={`/categories/${category.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
      <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#94a3b8" }} />
      {category.name}
    </Link>
  );
}
