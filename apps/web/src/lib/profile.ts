import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ProfilePrefs = { locale: string; baseCurrency: string; timezone: string };

/** Formatting preferences of the signed-in user, deduplicated per request. */
export const getProfilePrefs = cache(async (): Promise<ProfilePrefs> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("locale, base_currency, timezone").maybeSingle();
  return {
    locale: data?.locale ?? "es-ES",
    baseCurrency: data?.base_currency ?? "EUR",
    timezone: data?.timezone ?? "Europe/Madrid",
  };
});
