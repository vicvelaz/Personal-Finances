import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import { goalAdjustSchema, goalErrorMessage, goalProgress, goalSchema } from "./goals";

describe("goalSchema", () => {
  const valid = { name: "Vacaciones", targetAmount: "2.000", currency: "EUR", targetDate: "2027-06-01", accountId: "" };

  it("parses a goal", () => {
    expect(goalSchema.parse(valid)).toEqual({ ...valid, targetAmount: 200000, accountId: null });
  });

  it.each([
    ["empty name", { name: "" }, "name"],
    ["zero target", { targetAmount: "0" }, "targetAmount"],
    ["bad date", { targetDate: "2027-02-30" }, "targetDate"],
    ["bad currency", { currency: "BTC" }, "currency"],
  ])("rejects %s", (_, patch, field) => {
    const r = goalSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeDefined();
  });

  it("validates adjustments", () => {
    expect(goalAdjustSchema.parse({ direction: "deposit", amount: "250" }).amount).toBe(25000);
    expect(goalAdjustSchema.safeParse({ direction: "withdraw", amount: "0" }).success).toBe(false);
  });
});

describe("goalProgress", () => {
  it("computes monthly amount needed", () => {
    expect(goalProgress({ target: 200000, current: 25000, targetDate: "2027-06-01", today: "2026-10-01" })).toEqual({
      percent: 12.5,
      remaining: 175000,
      monthsLeft: 8,
      monthlyNeeded: 21875,
    });
  });

  it("handles no date, past date and achieved goals", () => {
    expect(goalProgress({ target: 100, current: 10, targetDate: null, today: "2026-10-01" }).monthlyNeeded).toBeNull();
    expect(goalProgress({ target: 100, current: 10, targetDate: "2026-01-01", today: "2026-10-01" }).monthsLeft).toBeNull();
    expect(goalProgress({ target: 100, current: 150, targetDate: "2027-01-01", today: "2026-10-01" })).toMatchObject({
      remaining: 0,
      monthlyNeeded: 0,
    });
    expect(goalProgress({ target: 1000, current: 0, targetDate: "2026-10-20", today: "2026-10-01" }).monthsLeft).toBe(1);
  });

  it("maps errors", () => {
    expect(goalErrorMessage("goal_negative_amount").field).toBe("amount");
  });
});

describe("goal transfers", () => {
  it("parses an optional account", () => {
    const id = "1e6a96f3-bb4b-4853-8f94-66d6b45cb991";
    expect(goalAdjustSchema.parse({ direction: "deposit", amount: "10", accountId: id }).accountId).toBe(id);
    expect(goalAdjustSchema.parse({ direction: "deposit", amount: "10", accountId: "" }).accountId).toBeNull();
    expect(goalAdjustSchema.parse({ direction: "deposit", amount: "10" }).accountId).toBeNull();
    expect(goalAdjustSchema.safeParse({ direction: "deposit", amount: "10", accountId: "x" }).success).toBe(false);
  });

  it("maps transfer errors to the account field", () => {
    expect(goalErrorMessage("goal_no_account")).toEqual({ field: "accountId", message: "Vincula una cuenta a la meta para mover dinero" });
    expect(goalErrorMessage("transfer_same_account").field).toBe("accountId");
    expect(goalErrorMessage("transfer_to_amount_required").field).toBe("accountId");
  });
});
