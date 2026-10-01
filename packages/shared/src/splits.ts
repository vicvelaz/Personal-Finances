import { z } from "zod";
import { parseMoneyInput } from "./money-input";
import { TRANSACTION_MESSAGES } from "./transactions";

export const splitLineSchema = z.object({
  categoryId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid({ error: "Categoría no válida" }).nullable()),
  amount: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const minor = parseMoneyInput(v);
      if (minor === null || minor <= 0) {
        ctx.addIssue({ code: "custom", message: "Introduce un importe mayor que 0 (máximo 2 decimales)" });
        return z.NEVER;
      }
      return minor;
    }),
});

/** Split lines as entered (amounts are positive magnitudes); the database applies the parent's sign. */
export const splitsSchema = z.array(splitLineSchema).min(2, { error: TRANSACTION_MESSAGES.splitTooFew });

export type SplitLine = z.output<typeof splitLineSchema>;

/** Validates lines against the parent magnitude; returns the payload for set_transaction_splits or an error. */
export function parseSplits(
  lines: { categoryId: string; amount: string }[],
  totalMagnitude: number,
): { ok: true; splits: { category_id: string | null; amount: number }[] } | { ok: false; errors: Record<string, string> } {
  const parsed = splitsSchema.safeParse(lines);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_form";
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const sum = parsed.data.reduce((acc, l) => acc + l.amount, 0);
  if (sum !== totalMagnitude) return { ok: false, errors: { _form: TRANSACTION_MESSAGES.splitSumMismatch } };
  return { ok: true, splits: parsed.data.map((l) => ({ category_id: l.categoryId, amount: l.amount })) };
}

/** Amount still to assign (minor units); unparseable inputs count as 0. */
export function splitRemaining(totalMagnitude: number, amounts: string[]): number {
  return amounts.reduce((acc, a) => acc - Math.max(parseMoneyInput(a) ?? 0, 0), totalMagnitude);
}
