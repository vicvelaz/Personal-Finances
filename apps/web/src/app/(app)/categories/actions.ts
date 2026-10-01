"use server";

import {
  CATEGORY_MESSAGES,
  categoryCreateSchema,
  categoryErrorMessage,
  categoryUpdateSchema,
  fieldErrors,
} from "@fin/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CategoryFormState = {
  errors?: Record<string, string>;
  error?: string;
};

function formValues(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return { name: get("name"), kind: get("kind"), parentId: get("parentId"), color: get("color") };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function toState(error: { code?: string; message?: string }): CategoryFormState {
  const mapped = categoryErrorMessage(error.code, error.message);
  return mapped.field ? { errors: { [mapped.field]: mapped.message } } : { error: mapped.message };
}

function done(): never {
  revalidatePath("/categories");
  redirect("/categories");
}

export async function createCategory(_: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const parsed = categoryCreateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    parent_id: parsed.data.parentId,
    color: parsed.data.color,
  });
  if (error) return toState(error);
  done();
}

export async function updateCategory(
  id: string,
  _: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = categoryUpdateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      parent_id: parsed.data.parentId,
      color: parsed.data.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return toState(error);
  if (!data.length) return { error: CATEGORY_MESSAGES.notFound };
  done();
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("categories").delete().eq("id", id).select("id");
  if (error) return { error: categoryErrorMessage(error.code, error.message).message };
  if (!data.length) return { error: CATEGORY_MESSAGES.notFound };
  done();
}
