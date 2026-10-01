import { describe, expect, it } from "vitest";
import { BUDGET_MESSAGES, budgetErrorMessage, budgetSchema, budgetStatus } from "./budgets";

describe("budgetSchema", () => {
  const valid = { categoryId: "1e6a96f3-bb4b-4853-8f94-66d6b45cb991", month: "2026-09", amount: "300" };

  it("parses a valid budget", () => {
    expect(budgetSchema.parse(valid)).toEqual({ ...valid, amount: 30000 });
  });

  it.each([
    [{ amount: "0" }],
    [{ month: "2026-13" }],
    [{ categoryId: "" }],
  ])("rejects %o", (patch) => {
    expect(budgetSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("budgetStatus", () => {
  it.each([
    [30000, 18000, { remaining: 12000, percent: 60, level: "ok" }],
    [30000, 24000, { remaining: 6000, percent: 80, level: "warning" }],
    [30000, 30000, { remaining: 0, percent: 100, level: "warning" }],
    [30000, 31000, { remaining: -1000, percent: 103, level: "over" }],
  ])("amount %i spent %i", (amount, spent, expected) => {
    expect(budgetStatus(amount, spent)).toEqual(expected);
  });
});

describe("budgetErrorMessage", () => {
  it("maps database errors", () => {
    expect(budgetErrorMessage("23505", "")).toEqual({ field: "categoryId", message: BUDGET_MESSAGES.duplicate });
    expect(budgetErrorMessage("P0001", "budget_invalid_amount").field).toBe("amount");
  });
});
