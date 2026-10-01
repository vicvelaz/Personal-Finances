const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

/** Today's date (YYYY-MM-DD) in the given IANA time zone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** First and last day (inclusive, YYYY-MM-DD) of a YYYY-MM month, or null if invalid. */
export function monthRange(month: string): { from: string; to: string } | null {
  const m = ISO_MONTH.exec(month);
  if (!m) return null;
  const [y, mo] = [Number(m[1]), Number(m[2])];
  if (mo < 1 || mo > 12) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** Adds `delta` months to a YYYY-MM month. */
export function shiftMonth(month: string, delta: number): string {
  const [y, mo] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Human label for a YYYY-MM month with an initial capital, e.g. "Septiembre de 2026". */
export function formatMonth(month: string, locale = "es-ES"): string {
  const [y, mo] = month.split("-").map(Number) as [number, number];
  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, mo - 1, 1)),
  );
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

/** Formats a YYYY-MM-DD date for display without time zone shifts. */
export function formatIsoDate(value: string, locale = "es-ES"): string {
  const [y, mo, d] = value.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, mo - 1, d)),
  );
}
