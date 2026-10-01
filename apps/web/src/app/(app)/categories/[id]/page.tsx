import type { CategoryRow } from "@fin/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{category.name}</h1>
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
