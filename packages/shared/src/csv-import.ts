import { z } from "zod";
import { toCsv } from "./data-rights";
import { isValidIsoDate } from "./dates";
import { parseMoneyInput } from "./money-input";

export const MAX_IMPORT_ROWS = 1000;

const SEPARATORS = [";", ",", "\t"] as const;

export const CANONICAL_IMPORT_FIELDS = [
  "date",
  "amount",
  "type",
  "category",
  "account",
  "description",
] as const;
export const OPTIONAL_IMPORT_FIELDS = ["destination_account"] as const;
export type CanonicalImportField = (typeof CANONICAL_IMPORT_FIELDS)[number] | (typeof OPTIONAL_IMPORT_FIELDS)[number];
export type CanonicalImportType = "EXPENSE" | "INCOME" | "TRANSFER";
export const INVALID_CSV_HEADER = "INVALID_CSV_HEADER" as const;

export type CanonicalImportHeader = Record<(typeof CANONICAL_IMPORT_FIELDS)[number], number> & {
  destination_account: number | null;
};

export type CanonicalImportRow = {
  occurredOn: string;
  amount: number;
  type: CanonicalImportType;
  category: string | null;
  account: string | null;
  destinationAccount: string | null;
  description: string | null;
};

export type ImportAccountOption = { id: string; name: string; currency: string; is_archived?: boolean };
export type ImportAccountError =
  | "source_account_not_found"
  | "source_account_ambiguous"
  | "invalid_default_account"
  | "destination_account_required"
  | "destination_account_not_found"
  | "destination_account_ambiguous"
  | "transfer_same_account"
  | "transfer_currency_mismatch";
export type ImportAccountResolution =
  | { ok: true; source: ImportAccountOption; destination?: ImportAccountOption }
  | { ok: false; error: ImportAccountError };

export type CanonicalImportPreviewRow = { line: number; value?: CanonicalImportRow; error?: string };

function normaliseAccountName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}

function matchAccount(name: string, accounts: readonly ImportAccountOption[]) {
  const normalized = normaliseAccountName(name);
  const matches = accounts.filter((account) => !account.is_archived && normaliseAccountName(account.name) === normalized);
  if (matches.length === 1) return { account: matches[0]!, error: undefined };
  return { account: undefined, error: matches.length ? "ambiguous" as const : "not_found" as const };
}

/** Resolves CSV account names to one active account and enforces same-currency CSV transfers. */
export function resolveImportAccounts(
  row: Pick<CanonicalImportRow, "type" | "account" | "destinationAccount">,
  accounts: readonly ImportAccountOption[],
  defaultAccountId: string,
): ImportAccountResolution {
  let source: ImportAccountOption | undefined;
  if (row.account?.trim()) {
    const match = matchAccount(row.account, accounts);
    if (!match.account) return { ok: false, error: match.error === "ambiguous" ? "source_account_ambiguous" : "source_account_not_found" };
    source = match.account;
  } else {
    source = accounts.find((account) => account.id === defaultAccountId && !account.is_archived);
    if (!source) return { ok: false, error: "invalid_default_account" };
  }

  if (row.type !== "TRANSFER") return { ok: true, source };
  if (!row.destinationAccount?.trim()) return { ok: false, error: "destination_account_required" };
  const match = matchAccount(row.destinationAccount, accounts);
  if (!match.account) {
    return {
      ok: false,
      error: match.error === "ambiguous" ? "destination_account_ambiguous" : "destination_account_not_found",
    };
  }
  if (source.id === match.account.id) return { ok: false, error: "transfer_same_account" };
  if (source.currency !== match.account.currency) return { ok: false, error: "transfer_currency_mismatch" };
  return { ok: true, source, destination: match.account };
}

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

/** Validates the canonical CSV header and returns the index of each field. */
export function validateImportHeader(headers: string[]): CanonicalImportHeader | typeof INVALID_CSV_HEADER {
  const indexes = new Map<string, number>();
  for (const [index, rawHeader] of headers.entries()) {
    const name = rawHeader.trim().toLowerCase();
    if (![...CANONICAL_IMPORT_FIELDS, ...OPTIONAL_IMPORT_FIELDS].includes(name as CanonicalImportField) || indexes.has(name)) {
      return INVALID_CSV_HEADER;
    }
    indexes.set(name, index);
  }

  if (CANONICAL_IMPORT_FIELDS.some((field) => !indexes.has(field))) return INVALID_CSV_HEADER;

  return {
    date: indexes.get("date")!,
    amount: indexes.get("amount")!,
    type: indexes.get("type")!,
    category: indexes.get("category")!,
    account: indexes.get("account")!,
    description: indexes.get("description")!,
    destination_account: indexes.get("destination_account") ?? null,
  };
}

function parseCanonicalAmount(value: string): number | null {
  const match = /^([+-]?)(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;

  const major = BigInt(match[2]!);
  const minor = major * BigInt(100) + BigInt((match[3] ?? "").padEnd(2, "0") || "0");
  const signed = match[1] === "-" ? -minor : minor;
  const amount = Number(signed);
  return Number.isSafeInteger(amount) ? amount : null;
}

/**
 * Parses canonical CSV rows, normalizing expense and income signs from `type`.
 * Returns INVALID_CSV_HEADER before processing rows when the header is not canonical.
 */
export function buildCanonicalImportRows(rows: string[][]):
  | { success: false; error: typeof INVALID_CSV_HEADER }
  | { success: true; rows: CanonicalImportPreviewRow[] } {
  const header = rows[0];
  const fields = header ? validateImportHeader(header) : INVALID_CSV_HEADER;
  if (fields === INVALID_CSV_HEADER) return { success: false, error: INVALID_CSV_HEADER };

  const cell = (row: string[], field: CanonicalImportField) => {
    const index = fields[field];
    return (index === null ? "" : (row[index] ?? "")).trim();
  };
  const parsedRows = rows.slice(1).map((row, index): CanonicalImportPreviewRow => {
    const line = index + 2;
    const occurredOn = parseImportDate(cell(row, "date"));
    if (!occurredOn) return { line, error: "Fecha no válida" };

    const rawType = cell(row, "type").toUpperCase();
    if (rawType !== "EXPENSE" && rawType !== "INCOME" && rawType !== "TRANSFER") {
      return { line, error: "Tipo no válido" };
    }
    const parsedAmount = parseCanonicalAmount(cell(row, "amount"));
    if (parsedAmount === null || parsedAmount === 0) return { line, error: "Importe no válido" };
    const amount = rawType === "EXPENSE" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    const description = cell(row, "description");
    if (description.length > 120) return { line, error: "Descripción demasiado larga" };

    return {
      line,
      value: {
        occurredOn,
        amount,
        type: rawType,
        category: cell(row, "category") || null,
        account: cell(row, "account") || null,
        destinationAccount: cell(row, "destination_account") || null,
        description: description || null,
      },
    };
  });

  return { success: true, rows: parsedRows };
}

export const TRANSACTIONS_CSV_HEADER = [
  "date",
  "amount",
  "type",
  "category",
  "account",
  "description",
  "destination_account",
] as const;

export type ExportTransactionRow = {
  occurred_on: string;
  kind: string;
  description: string | null;
  amount: number;
  transfer_group_id: string | null;
  account: { name: string } | null;
  category: { name: string } | null;
};

/** Exact "12.34" text from minor units, without floating-point conversion. */
function formatCsvAmount(minor: number): string {
  const abs = Math.abs(minor);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Canonical CSV of ordinary movements: positive magnitudes, `type` carrying the direction,
 * each transfer exported once from its negative leg and internal adjustments omitted.
 */
export function buildTransactionsCsv(rows: readonly ExportTransactionRow[]): string {
  const destinations = new Map<string, string>();
  for (const row of rows) {
    if (row.kind === "transfer" && row.transfer_group_id && row.amount > 0 && row.account) {
      destinations.set(row.transfer_group_id, row.account.name);
    }
  }

  const lines: (string | null)[][] = [];
  for (const row of rows) {
    if (row.kind === "expense" || row.kind === "income") {
      lines.push([
        row.occurred_on,
        formatCsvAmount(row.amount),
        row.kind.toUpperCase(),
        row.category?.name ?? null,
        row.account?.name ?? null,
        row.description,
        null,
      ]);
    } else if (row.kind === "transfer" && row.amount < 0 && row.transfer_group_id) {
      const destination = destinations.get(row.transfer_group_id);
      if (!destination) continue;
      lines.push([
        row.occurred_on,
        formatCsvAmount(row.amount),
        "TRANSFER",
        null,
        row.account?.name ?? null,
        row.description,
        destination,
      ]);
    }
  }
  return toCsv(TRANSACTIONS_CSV_HEADER, lines);
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
