import { z } from "zod";

/** Currencies with ECB reference rates (via Frankfurter). Others in SUPPORTED_CURRENCIES have no conversion. */
export const FX_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "MXN"] as const;

export type RateRow = { base: string; quote: string; rate_date: string; rate: number };

const ratesMap = z.record(z.string(), z.number().positive().finite());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const latestSchema = z.object({ base: z.literal("EUR"), date: isoDate, rates: ratesMap });
const seriesSchema = z.object({ base: z.literal("EUR"), start_date: isoDate, rates: z.record(isoDate, ratesMap) });

/** Normalises a Frankfurter `latest` or time-series response (base EUR) into rows for exchange_rates. */
export function parseFrankfurterRates(json: unknown): RateRow[] {
  const quotes = new Set<string>(FX_CURRENCIES.filter((c) => c !== "EUR"));
  const rows = (date: string, rates: Record<string, number>) =>
    Object.entries(rates)
      .filter(([quote]) => quotes.has(quote))
      .map(([quote, rate]) => ({ base: "EUR", quote, rate_date: date, rate }));

  const latest = latestSchema.safeParse(json);
  if (latest.success) return rows(latest.data.date, latest.data.rates);
  const series = seriesSchema.safeParse(json);
  if (series.success) return Object.entries(series.data.rates).flatMap(([date, rates]) => rows(date, rates));
  throw new Error("Respuesta de tipos de cambio no válida");
}

/** Frankfurter URL for the latest rates, or a time series starting at `from` (YYYY-MM-DD). */
export function frankfurterUrl(from?: string): string {
  const symbols = FX_CURRENCIES.filter((c) => c !== "EUR").join(",");
  const path = from ? `${from}..` : "latest";
  return `https://api.frankfurter.app/${path}?base=EUR&symbols=${symbols}`;
}
