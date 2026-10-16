import { describe, expect, it } from "vitest";
import {
  buildCanonicalImportRows,
  buildImportRows,
  guessMapping,
  importDuplicateKey,
  INVALID_CSV_HEADER,
  parseCsv,
  parseImportDate,
  resolveImportAccounts,
  validateImportHeader,
} from "./csv-import";
import { toCsv } from "./data-rights";

describe("parseCsv", () => {
  it("detects ; and handles quotes, escaped quotes, newlines and BOM", () => {
    const text = '\uFEFFfecha;descripcion;importe\r\n2026-09-01;"Cena; amigos";-12,50\n2026-09-02;"Dijo ""hola""\nadiós";100\n\n';
    expect(parseCsv(text)).toEqual([
      ["fecha", "descripcion", "importe"],
      ["2026-09-01", "Cena; amigos", "-12,50"],
      ["2026-09-02", 'Dijo "hola"\nadiós', "100"],
    ]);
  });

  it("detects , and tab separators", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("round-trips our own export, undoing the formula guard", () => {
    const csv = toCsv(["fecha", "descripcion", "importe"], [["2026-09-01", "=SUMA(A1)", -12.5]]);
    expect(parseCsv(csv)[1]).toEqual(["2026-09-01", "=SUMA(A1)", "-12.5"]);
  });
});

describe("canonical CSV import", () => {
  it("accepts canonical headers in any order and without case sensitivity", () => {
    expect(validateImportHeader(["DESCRIPTION", "Account", "TYPE", "Category", "AMOUNT", "DATE", "Destination_Account"])).toEqual({
      date: 5,
      amount: 4,
      type: 2,
      category: 3,
      account: 1,
      description: 0,
      destination_account: 6,
    });

    describe("canonical CSV account mapping", () => {
      const accounts = [
        { id: "one", name: "Cuenta Corriente", currency: "EUR", is_archived: false },
        { id: "two", name: "Ahorro", currency: "EUR", is_archived: false },
        { id: "three", name: "Ahorro", currency: "USD", is_archived: false },
        { id: "old", name: "Archivada", currency: "EUR", is_archived: true },
      ];

      it("uses the default only when the source account is empty", () => {
        expect(resolveImportAccounts({ type: "EXPENSE", account: null, destinationAccount: null }, accounts, "one")).toMatchObject({
          ok: true,
          source: { id: "one" },
        });
        expect(resolveImportAccounts({ type: "EXPENSE", account: "Desconocida", destinationAccount: null }, accounts, "one")).toEqual({
          ok: false,
          error: "source_account_not_found",
        });
      });

      it("matches names case- and accent-insensitively and rejects ambiguous or archived matches", () => {
        expect(resolveImportAccounts({ type: "INCOME", account: "cuenta corriente", destinationAccount: null }, accounts, "old")).toMatchObject({
          ok: true,
          source: { id: "one" },
        });
        expect(resolveImportAccounts({ type: "EXPENSE", account: "Ahorro", destinationAccount: null }, accounts, "one")).toEqual({
          ok: false,
          error: "source_account_ambiguous",
        });
        expect(resolveImportAccounts({ type: "EXPENSE", account: "Archivada", destinationAccount: null }, accounts, "one")).toEqual({
          ok: false,
          error: "source_account_not_found",
        });
        expect(resolveImportAccounts({ type: "EXPENSE", account: null, destinationAccount: null }, accounts, "old")).toEqual({
          ok: false,
          error: "invalid_default_account",
        });
      });

      it("requires a unique destination and rejects same-account or cross-currency transfers", () => {
        expect(resolveImportAccounts({ type: "TRANSFER", account: "Cuenta Corriente", destinationAccount: null }, accounts, "one")).toEqual({
          ok: false,
          error: "destination_account_required",
        });
        expect(resolveImportAccounts({ type: "TRANSFER", account: "Cuenta Corriente", destinationAccount: "Ahorro" }, accounts, "one")).toEqual({
          ok: false,
          error: "destination_account_ambiguous",
        });
        expect(resolveImportAccounts({ type: "TRANSFER", account: "Cuenta Corriente", destinationAccount: "cuenta corriente" }, accounts, "one")).toEqual({
          ok: false,
          error: "transfer_same_account",
        });
        expect(resolveImportAccounts({ type: "TRANSFER", account: "Cuenta Corriente", destinationAccount: "Dólares" }, [
          ...accounts,
          { id: "usd", name: "Dólares", currency: "USD", is_archived: false },
        ], "one")).toEqual({ ok: false, error: "transfer_currency_mismatch" });
      });
    });
    expect(validateImportHeader(["date", "amount", "type", "category", "account", "description"])).not.toBe(INVALID_CSV_HEADER);
  });

  it.each([
    [["date", "amount", "type", "category", "account"], INVALID_CSV_HEADER],
    [["date", "amount", "type", "category", "account", "description", "unknown"], INVALID_CSV_HEADER],
    [["date", "amount", "type", "category", "account", "description", "DATE"], INVALID_CSV_HEADER],
    [["date", "amount", "type", "category", "account", "description", "destination_account", "DESTINATION_ACCOUNT"], INVALID_CSV_HEADER],
  ])("rejects invalid header %j", (header, expected) => {
    expect(validateImportHeader(header)).toBe(expected);
  });

  it("returns INVALID_CSV_HEADER before processing rows", () => {
    expect(buildCanonicalImportRows([["date", "amount"], ["not a row"]])).toEqual({
      success: false,
      error: INVALID_CSV_HEADER,
    });
  });

  it("normalizes amount signs from type using exact minor units", () => {
    const result = buildCanonicalImportRows([
      ["date", "amount", "type", "category", "account", "description", "destination_account"],
      ["2026-10-15", "45.50", "expense", "Food", "Checking", "Lunch", ""],
      ["2026-10-16", "-45.50", "INCOME", "", "Checking", "Refund", ""],
      ["2026-10-17", "12,34", "Transfer", "", "Checking", "Move", "Savings"],
    ]);

    expect(result).toMatchObject({
      success: true,
      rows: [
        { line: 2, value: { amount: -4550, type: "EXPENSE", account: "Checking" } },
        { line: 3, value: { amount: 4550, type: "INCOME" } },
        { line: 4, value: { amount: 1234, type: "TRANSFER", destinationAccount: "Savings" } },
      ],
    });
  });

  it.each(["1.234", "12.345", "1,2,3", "1e3", "0"] )("rejects non-exact or non-positive amount %s", (amount) => {
    const result = buildCanonicalImportRows([
      ["date", "amount", "type", "category", "account", "description"],
      ["2026-10-15", amount, "INCOME", "", "Checking", ""],
    ]);

    expect(result.success).toBe(true);
    if (result.success) expect(result.rows[0]?.error).toBe("Importe no válido");
  });
});

describe("guessMapping", () => {
  it("recognises Spanish and English headers", () => {
    expect(guessMapping(["Fecha", "Tipo", "Cuenta", "Categoría", "Descripción", "Importe", "Moneda"])).toEqual({
      date: 0,
      amount: 5,
      description: 4,
      category: 3,
      kind: 1,
      currency: 6,
      account: 2,
    });
    expect(guessMapping(["Date", "Memo", "Amount"])).toEqual({
      date: 0,
      amount: 2,
      description: 1,
      category: null,
      kind: null,
      currency: null,
      account: null,
    });
  });
});

describe("parseImportDate", () => {
  it.each([
    ["2026-09-01", "2026-09-01"],
    ["1/9/2026", "2026-09-01"],
    ["01-09-2026", "2026-09-01"],
    ["01.09.2026", "2026-09-01"],
    ["31/02/2026", null],
    ["2026/09/01", null],
    ["", null],
  ])("%s → %s", (input, expected) => {
    expect(parseImportDate(input)).toBe(expected);
  });
});

describe("buildImportRows", () => {
  const rows = [
    ["Fecha", "Concepto", "Importe", "Categoría"],
    ["01/09/2026", "Mercadona", "-45,20", "Supermercado"],
    ["02/09/2026", "", "1.500,00", ""],
    ["xx", "Mal", "-1", ""],
    ["03/09/2026", "Cero", "0", ""],
  ];
  const mapping = { date: 0, description: 1, amount: 2, category: 3 };

  it("maps valid rows and reports errors with file line numbers", () => {
    expect(buildImportRows(rows, mapping, true)).toEqual([
      { line: 2, value: { occurredOn: "2026-09-01", amount: -4520, description: "Mercadona", category: "Supermercado" } },
      { line: 3, value: { occurredOn: "2026-09-02", amount: 150000, description: null, category: null } },
      { line: 4, error: "Fecha no válida" },
      { line: 5, error: "Importe no válido" },
    ]);
  });

  it("builds case-insensitive duplicate keys", () => {
    expect(importDuplicateKey({ occurredOn: "2026-09-01", amount: -4520, description: " Mercadona " })).toBe(
      importDuplicateKey({ occurredOn: "2026-09-01", amount: -4520, description: "mercadona" }),
    );
  });
});

describe("buildImportRows with our export columns", () => {
  const rows = [
    ["fecha", "tipo", "cuenta", "categoria", "descripcion", "importe", "moneda"],
    ["2026-09-01", "expense", "Nómina BBVA", "Luz", "Luz", "-64.3", "EUR"],
    ["2026-09-02", "transfer", "Nómina BBVA", "", "Ahorro", "-100", "EUR"],
    ["2026-09-03", "expense", "Dólares", "", "Spotify", "-10.99", "USD"],
    ["2026-09-04", "income", "nomina bbva", "", "Bizum", "25", "USD"],
  ];
  const mapping = { date: 0, kind: 1, account: 2, category: 3, description: 4, amount: 5, currency: 6 };

  it("drops transfers, other accounts and other currencies", () => {
    const out = buildImportRows(rows, mapping, true, { accountName: "Nómina BBVA", currency: "EUR" });
    expect(out.map((r) => r.error ?? r.value?.amount)).toEqual([
      -6430,
      "Las transferencias no se importan",
      "Es de otra cuenta (Dólares)",
      "Moneda distinta de la cuenta (USD)",
    ]);
  });
});
