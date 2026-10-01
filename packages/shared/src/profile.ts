import { z } from "zod";

export const SUPPORTED_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "MXN",
  "ARS",
  "COP",
  "CLP",
  "PEN",
] as const;

export const SUPPORTED_LOCALES = [
  "es-ES",
  "es-MX",
  "es-AR",
  "es-CO",
  "en-US",
  "en-GB",
] as const;

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(80, { error: "El nombre no puede superar 80 caracteres" })
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  baseCurrency: z.enum(SUPPORTED_CURRENCIES, { error: "Moneda no soportada" }),
  locale: z.enum(SUPPORTED_LOCALES, { error: "Idioma no soportado" }),
  timezone: z
    .string()
    .trim()
    .refine(isValidTimeZone, { error: "Zona horaria no válida" }),
});

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdate = z.output<typeof profileUpdateSchema>;
