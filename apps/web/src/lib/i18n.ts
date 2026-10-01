import { SUPPORTED_LOCALES, getLanguage, translate } from "@fin/shared";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getProfilePrefs } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const getServerLocale = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return (await getProfilePrefs()).locale;
  const cookieLocale = (await cookies()).get("fin-locale")?.value;
  if (
    cookieLocale &&
    SUPPORTED_LOCALES.includes(
      cookieLocale as (typeof SUPPORTED_LOCALES)[number],
    )
  ) {
    return cookieLocale;
  }
  const preferredLanguage = (await headers())
    .get("accept-language")
    ?.split(",")[0];
  return getLanguage(preferredLanguage) === "en" ? "en-US" : "es-ES";
});

export async function translateServer(
  message: string,
  values?: Record<string, string | number>,
) {
  return translate(await getServerLocale(), message, values);
}

export async function getHtmlLanguage() {
  return getLanguage(await getServerLocale());
}
