import { z } from "zod";
import { isValidIsoDate } from "./dates";
import { parseMoneyInput } from "./money-input";

export const MAX_IMPORT_ROWS = 1000;

const SEPARATORS = [";", ",", "\t"] as const;

/** Picks the separator that appears most often outside quotes in the first line. */
function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  let best: string = ",";
  let bestCount = 0;
  for (const sep of SEPARATORS) {
    let count = 0;
    let quoted = false;
    for (const ch of firstLine) {
      if (ch === '"') quoted = !quoted;
      else if (ch === sep && !quoted) count++;
    }
    if (count > bestCount) {
      best = sep;
      bestCount = count;
    }
  }
  return best;
}

// Our own export prefixes "'" to values a spreadsheet would treat as formulas.
const FORMULA_GUARD = /^'[=+\-@\t\r]/;

/** RFC 4180 CSV parser: auto-detected separator, quoted fields, BOM removal, blank lines skipped. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(FORMULA_GUARD.test(field) ? field.slice(1) : field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === sep) {
      endField();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) endRow();
  return rows;
}

export const IMPORT_FIELDS = ["date", "amount", "description", "category", "kind", "currency", "account"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ImportMapping = { date: number; amount: number } & Partial<Record<Exclude<ImportField, "date" | "amount">, number | null>>;

const SYNONYMS: Record<ImportField, string[]> = {
  date: ["fecha", "date", "fecha operacion", "fecha valor", "f valor", "f operacion"],
  amount: ["importe", "amount", "cantidad", "monto", "valor"],
  description: ["descripcion", "description", "concepto", "detalle", "memo"],
  category: ["categoria", "category"],
  kind: ["tipo", "type", "kind"],
  currency: ["moneda", "divisa", "currency"],
  account: ["cuenta", "account"],
};

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Column index per field guessed from header names; null when not recognised. */
export function guessMapping(headers: string[]): Record<ImportField, number | null> {
  const names = headers.map(normalise);
  const out = {} as Record<ImportField, number | null>;
  for (const f of IMPORT_FIELDS) {
    const i = names.findIndex((n) => SYNONYMS[f].includes(n));
    out[f] = i === -1 ? null : i;
  }
  return out;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY and DD.MM.YYYY; returns ISO or null. */
export function parseImportDate(value: string): string | null {
  const v = value.trim();
  if (isValidIsoDate(v)) return v;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

export const importRowSchema = z.object({
  occurredOn: z.string().refine(isValidIsoDate),
  /** Signed minor units: negative = expense, positive = income. */
  amount: z.number().int().refine((v) => v !== 0 && Number.isSafeInteger(v)),
  description: z.string().max(120).nullable(),
  category: z.string().max(60).nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportPreviewRow = { line: number; value?: ImportRow; error?: string };

/**
 * Converts CSV rows to import rows using a column mapping. Line numbers are 1-based as in the file.
 * Optional kind/currency/account columns (e.g. in our own export) drop transfers and rows of other accounts.
 */
export function buildImportRows(
  rows: string[][],
  mapping: ImportMapping,
  hasHeader: boolean,
  target: { accountName?: string; currency?: string } = {},
): ImportPreviewRow[] {
  const cell = (r: string[], i: number | null | undefined) => (i === null || i === undefined ? "" : (r[i] ?? "").trim());
  return rows.slice(hasHeader ? 1 : 0).map((r, idx) => {
    const line = idx + (hasHeader ? 2 : 1);
    if (["transfer", "transferencia"].includes(normalise(cell(r, mapping.kind)))) {
      return { line, error: "Las transferencias no se importan" };
    }
    const account = cell(r, mapping.account);
    if (account && target.accountName && normalise(account) !== normalise(target.accountName)) {
      return { line, error: `Es de otra cuenta (${account})` };
    }
    const currency = cell(r, mapping.currency).toUpperCase();
    if (currency && target.currency && currency !== target.currency) {
      return { line, error: `Moneda distinta de la cuenta (${currency})` };
    }
    const occurredOn = parseImportDate(cell(r, mapping.date));
    if (!occurredOn) return { line, error: "Fecha no válida" };
    const amount = parseMoneyInput(cell(r, mapping.amount));
    if (amount === null || amount === 0) return { line, error: "Importe no válido" };
    const description = cell(r, mapping.description);
    if (description.length > 120) return { line, error: "Descripción demasiado larga" };
    const category = cell(r, mapping.category);
    return {
      line,
      value: { occurredOn, amount, description: description || null, category: category ? category.slice(0, 60) : null },
    };
  });
}

/** Key used to detect a row that already exists in the account. */
export function importDuplicateKey(r: { occurredOn: string; amount: number; description: string | null }): string {
  return `${r.occurredOn}|${r.amount}|${(r.description ?? "").trim().toLowerCase()}`;
}
