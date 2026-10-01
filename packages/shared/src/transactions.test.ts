import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import { escapeLike, signedAmount, TRANSACTION_MESSAGES, transactionErrorMessage, transactionSchema } from "./transactions";

const A = "1e6a96f3-bb4b-4853-8f94-66d6b45cb991";
const B = "7bbd45d3-404e-4054-abb9-d6a2eeab4add";
const C = "448d329e-ec76-4ece-bc12-31ee78dd2de2";
const base = {
  kind: "expense",
  accountId: A,
  toAccountId: "",
  categoryId: C,
  amount: "12,50",
  occurredOn: "2026-09-30",
  description: " Súper ",
  notes: "",
};

describe("transactionSchema", () => {
  it("parses an expense", () => {
    expect(transactionSchema.parse(base)).toEqual({
      kind: "expense",
      accountId: A,
      toAccountId: null,
      categoryId: C,
      amount: 1250,
      occurredOn: "2026-09-30",
      description: "Súper",
      notes: null,
      toAmount: null,
    });
  });

  it("drops the category of a transfer and requires a distinct destination", () => {
    const ok = transactionSchema.parse({ ...base, kind: "transfer", toAccountId: B });
    expect(ok.categoryId).toBeNull();
    expect(ok.toAccountId).toBe(B);

    const same = transactionSchema.safeParse({ ...base, kind: "transfer", toAccountId: A });
    expect(same.success).toBe(false);
    if (!same.success) expect(fieldErrors(same.error).toAccountId).toBeDefined();

    const missing = transactionSchema.safeParse({ ...base, kind: "transfer" });
    expect(missing.success).toBe(false);
  });

  it.each([
    ["zero amount", { amount: "0" }, "amount"],
    ["negative amount", { amount: "-5" }, "amount"],
    ["bad date", { occurredOn: "2026-02-30" }, "occurredOn"],
    ["no account", { accountId: "" }, "accountId"],
    ["long description", { description: "x".repeat(121) }, "description"],
  ])("rejects %s", (_, patch, field) => {
    const r = transactionSchema.safeParse({ ...base, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeDefined();
  });
});

describe("helpers", () => {
  it("signs amounts by kind", () => {
    expect(signedAmount("expense", 1250)).toBe(-1250);
    expect(signedAmount("income", 1250)).toBe(1250);
  });

  it("maps database errors", () => {
    expect(transactionErrorMessage("transfer_currency_mismatch")).toEqual({
      field: "toAccountId",
      message: TRANSACTION_MESSAGES.currencyMismatch,
    });
    expect(transactionErrorMessage("whatever").message).toBe(TRANSACTION_MESSAGES.unexpected);
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});
