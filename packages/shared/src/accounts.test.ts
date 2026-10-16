import { describe, expect, it } from "vitest";
import { accountReconciliationErrorKey } from "./accounts";

describe("accountReconciliationErrorKey", () => {
  it.each([
    ["reconciliation_invalid_account", "accounts.accountNotFound"],
    ["transaction_account_archived", "accounts.cannotReconcileArchived"],
    ["mfa_required", "auth.mfaRequired"],
    ["unknown_error", "accounts.reconciliationFailed"],
    [undefined, "accounts.reconciliationFailed"],
  ] as const)("maps %s to %s", (message, key) => {
    expect(accountReconciliationErrorKey(message)).toBe(key);
  });
});
import { accountCreateSchema, accountUpdateSchema, totalsByCurrency } from "./accounts";
import { fieldErrors } from "./auth";
import { minorToInput } from "./money-input";

const valid = { name: " Nómina ", type: "checking", currency: "EUR", openingBalance: "1.250,50" };

describe("accountCreateSchema", () => {
  it("parses a valid account into minor units", () => {
    expect(accountCreateSchema.parse(valid)).toEqual({
      name: "Nómina",
      type: "checking",
      currency: "EUR",
      openingBalance: 125050,
    });
  });

  it("defaults an empty balance to 0 and accepts negatives", () => {
    expect(accountCreateSchema.parse({ ...valid, openingBalance: "" }).openingBalance).toBe(0);
    expect(accountCreateSchema.parse({ ...valid, openingBalance: "-300" }).openingBalance).toBe(-30000);
  });

  it.each([
    ["empty name", { name: "  " }, "name"],
    ["long name", { name: "x".repeat(61) }, "name"],
    ["bad type", { type: "crypto" }, "type"],
    ["bad currency", { currency: "BTC" }, "currency"],
    ["too many decimals", { openingBalance: "12,3456" }, "openingBalance"],
    ["not a number", { openingBalance: "abc" }, "openingBalance"],
  ])("rejects %s", (_, patch, field) => {
    const r = accountCreateSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeDefined();
  });
});

describe("accountUpdateSchema", () => {
  it("drops currency", () => {
    const r = accountUpdateSchema.parse({ ...valid, currency: "USD" });
    expect(r).not.toHaveProperty("currency");
  });
});

describe("totalsByCurrency", () => {
  it("groups active accounts by currency without mixing", () => {
    expect(
      totalsByCurrency([
        { currency: "EUR", balance: 10000, isArchived: false },
        { currency: "EUR", balance: -3000, isArchived: false },
        { currency: "USD", balance: 5000, isArchived: false },
        { currency: "EUR", balance: 99999, isArchived: true },
      ]),
    ).toEqual([
      { currency: "EUR", total: 7000 },
      { currency: "USD", total: 5000 },
    ]);
  });
});

describe("minorToInput", () => {
  it("uses the locale decimal mark", () => {
    expect(minorToInput(125050, "es-ES")).toBe("1250,50");
    expect(minorToInput(-5, "en-US")).toBe("-0.05");
  });
});
