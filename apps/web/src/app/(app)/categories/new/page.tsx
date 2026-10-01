import type { CategoryRow } from "@fin/shared";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createCategory } from "../actions";
import { CategoryForm } from "../category-form";
import { T } from "@/components/i18n-provider";
import { translateServer } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await translateServer("categories.newCategory") };
}

export default async function NewCategoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, kind, parent_id, color")
    .is("parent_id", null)
    .order("name")
    .returns<CategoryRow[]>();

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold"><T id="categories.newCategory" /></h1>
      <CategoryForm
        action={createCategory}
        initial={{ name: "", kind: "expense", parentId: "", color: "" }}
        parents={data ?? []}
        submitLabel="Crear categoría"
      />
    </section>
  );
}
