import { describe, expect, it } from "vitest";
import { frankfurterUrl, parseFrankfurterRates } from "./rates";
import { transactionSchema } from "./transactions";

describe("parseFrankfurterRates", () => {
  it("parses a latest response and drops unsupported quotes", () => {
    const rows = parseFrankfurterRates({ amount: 1, base: "EUR", date: "2026-09-30", rates: { USD: 1.1, JPY: 160, GBP: 0.85 } });
    expect(rows).toEqual([
      { base: "EUR", quote: "USD", rate_date: "2026-09-30", rate: 1.1 },
      { base: "EUR", quote: "GBP", rate_date: "2026-09-30", rate: 0.85 },
    ]);
  });

  it("parses a time series", () => {
    const rows = parseFrankfurterRates({
      base: "EUR",
      start_date: "2026-09-28",
      end_date: "2026-09-29",
      rates: { "2026-09-28": { USD: 1.1 }, "2026-09-29": { USD: 1.2 } },
    });
    expect(rows.map((r) => [r.rate_date, r.rate])).toEqual([
      ["2026-09-28", 1.1],
      ["2026-09-29", 1.2],
    ]);
  });

  it.each([{ base: "USD", date: "2026-09-30", rates: { EUR: 0.9 } }, { base: "EUR", date: "x", rates: {} }, { base: "EUR", date: "2026-09-30", rates: { USD: -1 } }, null])(
    "rejects invalid payload %#",
    (json) => {
      expect(() => parseFrankfurterRates(json)).toThrow();
    },
  );

  it("builds URLs", () => {
    expect(frankfurterUrl()).toBe("https://api.frankfurter.app/latest?base=EUR&symbols=USD,GBP,CHF,MXN");
    expect(frankfurterUrl("2026-01-01")).toContain("/2026-01-01..?");
  });
});

describe("transactionSchema toAmount", () => {
  const base = { accountId: "1e6a96f3-bb4b-4853-8f94-66d6b45cb991", categoryId: "", amount: "100", occurredOn: "2026-09-30", description: "", notes: "" };

  it("keeps the received amount for transfers", () => {
    const v = transactionSchema.parse({ ...base, kind: "transfer", toAccountId: "2e6a96f3-bb4b-4853-8f94-66d6b45cb991", toAmount: "108,50" });
    expect(v.toAmount).toBe(10850);
  });

  it("drops it for other kinds and defaults to null", () => {
    expect(transactionSchema.parse({ ...base, kind: "expense", toAccountId: "", toAmount: "5" }).toAmount).toBeNull();
    expect(transactionSchema.parse({ ...base, kind: "transfer", toAccountId: "2e6a96f3-bb4b-4853-8f94-66d6b45cb991" }).toAmount).toBeNull();
  });

  it("rejects invalid received amounts", () => {
    const r = transactionSchema.safeParse({ ...base, kind: "transfer", toAccountId: "2e6a96f3-bb4b-4853-8f94-66d6b45cb991", toAmount: "0" });
    expect(r.success).toBe(false);
  });
});
