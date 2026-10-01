import { describe, expect, it } from "vitest";
import { buildImportRows, guessMapping, importDuplicateKey, parseCsv, parseImportDate } from "./csv-import";
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
