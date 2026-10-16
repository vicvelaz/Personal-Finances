import { describe, expect, it } from "vitest";
import {
  annualBudgetMonthlyEquivalent,
  BUDGET_MESSAGES,
  budgetErrorMessage,
  budgetPeriodRange,
  budgetPeriodsOverlap,
  budgetSchema,
  budgetStatus,
  monthlyBudgetExpectedToDate,
  planAnnualMonthlyBudget,
} from "./budgets";

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

describe("budget periods and annual planning", () => {
  it("uses month periods for once and monthly budgets and natural years for annual budgets", () => {
    expect(budgetPeriodRange("once", "2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(budgetPeriodRange("monthly", "2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(budgetPeriodRange("annual", "2028-02")).toEqual({ from: "2028-01-01", to: "2028-12-31" });
    expect(budgetPeriodRange("monthly", "2026-13")).toBeNull();
  });

  it("detects overlap across single, recurring monthly and annual periods", () => {
    expect(
      budgetPeriodsOverlap(
        { period: "once", startsIn: "2026-09" },
        { period: "monthly", startsIn: "2026-01", endsIn: "2026-12" },
      ),
    ).toBe(true);
    expect(
      budgetPeriodsOverlap(
        { period: "annual", startsIn: "2026-01", endsIn: "2027-12" },
        { period: "monthly", startsIn: "2027-06", endsIn: "2027-08" },
      ),
    ).toBe(true);
    expect(
      budgetPeriodsOverlap(
        { period: "annual", startsIn: "2025-01", endsIn: "2025-12" },
        { period: "once", startsIn: "2026-02" },
      ),
    ).toBe(false);
    expect(budgetPeriodsOverlap({ period: "once", startsIn: "2026-01", endsIn: "2026-02" }, { period: "once", startsIn: "2026-01" })).toBeNull();
  });

  it("rounds annual equivalents and prorates elapsed days, including leap years", () => {
    expect(annualBudgetMonthlyEquivalent(360000)).toBe(30000);
    expect(annualBudgetMonthlyEquivalent(10000)).toBe(833);
    expect(monthlyBudgetExpectedToDate(30000, "2026-03-15")).toBe(74516);
    expect(monthlyBudgetExpectedToDate(29000, "2028-02-15")).toBe(44000);
    expect(monthlyBudgetExpectedToDate(30000, "2026-02-31")).toBeNull();
  });

  it("distributes a future monthly increase across complete months and respects the annual cap", () => {
    const result = planAnnualMonthlyBudget({
      monthlyLimit: 30000,
      currentMonth: "2026-02",
      targetMonth: "2026-06",
      targetLimit: 36000,
    });

    expect(result).toMatchObject({
      success: true,
      annualLimit: 360000,
      plannedTotal: 360000,
      monthlyLimits: { "2026-03": 28000, "2026-04": 28000, "2026-05": 28000, "2026-06": 36000 },
    });
    expect(planAnnualMonthlyBudget({
      monthlyLimit: 30000,
      currentMonth: "2026-02",
      targetMonth: "2026-03",
      targetLimit: 36000,
    })).toEqual({ success: false, uncovered: 6000 });
    expect(budgetStatus(360000, 125000).remaining).toBe(235000);
  });
});

describe("budgetErrorMessage", () => {
  it("maps database errors", () => {
    expect(budgetErrorMessage("23505", "")).toEqual({ field: "categoryId", message: BUDGET_MESSAGES.duplicate });
    expect(budgetErrorMessage("P0001", "budget_invalid_amount").field).toBe("amount");
  });
});
