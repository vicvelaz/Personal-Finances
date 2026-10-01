import { z } from "zod";

export type CsvValue = string | number | null | undefined;

// Leading characters that spreadsheets interpret as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function cell(value: CsvValue, separator: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (text.includes(separator) || /["\r\n]/.test(text) || text !== value) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** RFC 4180-style CSV with a UTF-8 BOM (for Excel) and formula-injection protection. */
export function toCsv(headers: readonly string[], rows: readonly CsvValue[][], separator = ";"): string {
  const lines = [headers, ...rows].map((r) => r.map((v) => cell(v, separator)).join(separator));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export const DELETE_CONFIRMATION = "BORRAR";

export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, { error: `Escribe ${DELETE_CONFIRMATION} para confirmar` }),
  password: z.string().min(1, { error: "Introduce tu contraseña" }),
});
