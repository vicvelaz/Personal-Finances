import { describe, expect, it } from "vitest";
import { parseSplits, splitRemaining } from "./splits";
import { TRANSACTION_MESSAGES, transactionErrorMessage } from "./transactions";

const cat = "1e6a96f3-bb4b-4853-8f94-66d6b45cb991";

describe("parseSplits", () => {
  it("returns positive minor units when lines add up", () => {
    const r = parseSplits([{ categoryId: cat, amount: "40" }, { categoryId: "", amount: "60,00" }], 10000);
    expect(r).toEqual({ ok: true, splits: [{ category_id: cat, amount: 4000 }, { category_id: null, amount: 6000 }] });
  });

  it("rejects a sum different from the total", () => {
    const r = parseSplits([{ categoryId: "", amount: "40" }, { categoryId: "", amount: "50" }], 10000);
    expect(r).toEqual({ ok: false, errors: { _form: TRANSACTION_MESSAGES.splitSumMismatch } });
  });

  it("requires at least 2 lines", () => {
    const r = parseSplits([{ categoryId: "", amount: "100" }], 10000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors._form).toBe(TRANSACTION_MESSAGES.splitTooFew);
  });

  it("reports the invalid line amount", () => {
    const r = parseSplits([{ categoryId: "", amount: "0" }, { categoryId: "", amount: "100" }], 10000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors["0.amount"]).toBeDefined();
  });
});

describe("splitRemaining", () => {
  it("subtracts parseable amounts", () => {
    expect(splitRemaining(10000, ["40", "", "abc"])).toBe(6000);
    expect(splitRemaining(10000, ["40", "70"])).toBe(-1000);
  });
});

describe("split errors", () => {
  it("maps database codes", () => {
    expect(transactionErrorMessage("split_sum_mismatch")).toEqual({ field: "amount", message: TRANSACTION_MESSAGES.splitSumMismatch });
    expect(transactionErrorMessage("split_transfer").message).toBe(TRANSACTION_MESSAGES.splitTransfer);
  });
});
