import { describe, expect, it } from "vitest";
import {
  annualBudgetMonthlyEquivalent,
  BUDGET_MESSAGES,
  budgetErrorMessage,
  budgetPeriodRange,
  budgetPeriodsOverlap,
  budgetCreateSchema,
  budgetInsightLines,
  budgetInsights,
  prepareBudgetMonthPlan,
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

describe("prepareBudgetMonthPlan and insight lines", () => {
  it("returns only future months up to the target and preserves the annual total", () => {
    const plan = prepareBudgetMonthPlan({ monthlyLimit: 30000, currentMonth: "2026-02", targetMonth: "2026-06", targetLimit: 36000 });
    expect(plan).toEqual({
      ok: true,
      rows: [
        { month: "2026-03", amount: 28000 },
        { month: "2026-04", amount: 28000 },
        { month: "2026-05", amount: 28000 },
        { month: "2026-06", amount: 36000 },
      ],
    });
  });

  it("rejects past months, plans beyond the annual limit and plans that zero a month", () => {
    expect(prepareBudgetMonthPlan({ monthlyLimit: 30000, currentMonth: "2026-02", targetMonth: "2026-01", targetLimit: 1 })).toEqual({ ok: false, reason: "invalid_month" });
    expect(prepareBudgetMonthPlan({ monthlyLimit: 30000, currentMonth: "2026-02", targetMonth: "2026-03", targetLimit: 36000 })).toEqual({ ok: false, reason: "exceeds_limit", uncovered: 6000 });
    expect(prepareBudgetMonthPlan({ monthlyLimit: 30000, currentMonth: "2026-02", targetMonth: "2026-04", targetLimit: 60000 })).toEqual({ ok: false, reason: "invalid_amount" });
  });

  it("builds identical localized lines for any client", () => {
    const insights = budgetInsights({ period: "annual", baseAmount: 360000, yearSpent: 100000, today: "2026-06-10" })!;
    const lines = budgetInsightLines("es-ES", "annual", insights, "EUR");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("3600");
    expect(lines[1]).toContain("300");
  });
});

describe("budgetInsights", () => {
  it("projects a monthly budget against the annual limit and expected pace", () => {
    expect(budgetInsights({ period: "monthly", baseAmount: 30000, yearSpent: 90000, today: "2026-03-15" })).toEqual({
      annualLimit: 360000,
      monthlyEquivalent: 30000,
      annualEstimate: 360000,
      yearSpent: 90000,
      expectedToDate: 74516,
      aboveExpected: 15484,
      maxMonthlyRemaining: 27000,
    });
  });

  it("shows the monthly equivalent of an annual budget without changing its limit", () => {
    expect(budgetInsights({ period: "annual", baseAmount: 360000, yearSpent: 0, today: "2026-12-31" })).toMatchObject({
      annualLimit: 360000,
      monthlyEquivalent: 30000,
      annualEstimate: null,
      expectedToDate: null,
      maxMonthlyRemaining: 360000,
    });
  });

  it("never suggests a negative spending pace and ignores one-off budgets", () => {
    expect(budgetInsights({ period: "monthly", baseAmount: 30000, yearSpent: 400000, today: "2026-06-01" })?.maxMonthlyRemaining).toBe(0);
    expect(budgetInsights({ period: "once", baseAmount: 30000, yearSpent: 0, today: "2026-06-01" })).toBeNull();
  });
});

describe("budgetCreateSchema", () => {
  const base = { categoryId: "1e6a96f3-bb4b-4853-8f94-66d6b45cb991", month: "2026-09", amount: "300" };

  it("defaults to a one-off budget with no end", () => {
    expect(budgetCreateSchema.parse(base)).toEqual({ ...base, amount: 30000, period: "once", endMonth: null });
  });

  it("accepts recurring budgets with an optional end month", () => {
    expect(budgetCreateSchema.parse({ ...base, period: "monthly", endMonth: "2026-12" })).toMatchObject({ period: "monthly", endMonth: "2026-12" });
    expect(budgetCreateSchema.parse({ ...base, period: "annual" }).endMonth).toBeNull();
  });

  it.each([
    [{ period: "once", endMonth: "2026-10" }],
    [{ period: "monthly", endMonth: "2026-08" }],
    [{ period: "weekly" }],
  ])("rejects %o", (patch) => {
    expect(budgetCreateSchema.safeParse({ ...base, ...patch }).success).toBe(false);
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
