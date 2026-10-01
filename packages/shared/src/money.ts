/**
 * Monetary amounts are stored and computed as integer minor units (cents)
 * to avoid floating point drift.
 */
export type Minor = number;

export function toMinor(amount: number): Minor {
  return Math.round(amount * 100);
}

export function fromMinor(minor: Minor): number {
  return minor / 100;
}

export function formatMoney(
  minor: Minor,
  currency: string,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(fromMinor(minor));
}
