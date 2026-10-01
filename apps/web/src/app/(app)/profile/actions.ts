"use server";

import { fieldErrors, profileUpdateSchema } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  errors?: Record<string, string>;
  error?: string;
  message?: string;
};

export async function updateProfile(
  _: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileUpdateSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    baseCurrency: formData.get("baseCurrency"),
    locale: formData.get("locale"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      base_currency: parsed.data.baseCurrency,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: "No se pudo guardar el perfil. Inténtalo de nuevo" };

  (await cookies()).set("fin-locale", parsed.data.locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { message: "Perfil actualizado" };
}
