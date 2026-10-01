import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import { isDue, postAmountSchema, reminderDate, SCHEDULED_MESSAGES, scheduledErrorMessage, scheduledSchema } from "./scheduled";

const valid = {
  kind: "expense",
  accountId: "1e6a96f3-bb4b-4853-8f94-66d6b45cb991",
  categoryId: "",
  amount: "800",
  description: " Alquiler ",
  recurrence: "monthly",
  startsOn: "2026-10-01",
  endsOn: "",
  isEstimated: false,
};

describe("scheduledSchema", () => {
  it("defaults to manual posting without reminder", () => {
    expect(scheduledSchema.parse(valid)).toMatchObject({ autoPost: false, reminderDaysBefore: null });
  });

  it("parses auto-post and reminder days", () => {
    expect(scheduledSchema.parse({ ...valid, autoPost: true, reminderDaysBefore: " 3 " })).toMatchObject({
      autoPost: true,
      reminderDaysBefore: 3,
    });
  });

  it.each(["31", "-1", "1.5", "abc"])("rejects reminder %s", (days) => {
    const r = scheduledSchema.safeParse({ ...valid, reminderDaysBefore: days });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).reminderDaysBefore).toBe("Introduce un número de días entre 0 y 30");
  });

  it("rejects auto-post of estimated amounts", () => {
    const r = scheduledSchema.safeParse({ ...valid, isEstimated: true, autoPost: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).autoPost).toBeDefined();
  });

  it("parses a monthly expense", () => {
    expect(scheduledSchema.parse(valid)).toMatchObject({
      amount: 80000,
      description: "Alquiler",
      categoryId: null,
      endsOn: null,
    });
  });

  it.each([
    ["no description", { description: " " }, "description"],
    ["zero amount", { amount: "0" }, "amount"],
    ["transfer", { kind: "transfer" }, "kind"],
    ["ends before start", { endsOn: "2026-09-01" }, "endsOn"],
    ["bad start", { startsOn: "2026-02-31" }, "startsOn"],
  ])("rejects %s", (_, patch, field) => {
    const r = scheduledSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeDefined();
  });
});

describe("helpers", () => {
  it("parses optional post amounts", () => {
    expect(postAmountSchema.parse("")).toBeNull();
    expect(postAmountSchema.parse("64,30")).toBe(6430);
    expect(postAmountSchema.safeParse("0").success).toBe(false);
  });

  it("detects due dates", () => {
    expect(isDue("2026-09-30", "2026-09-30")).toBe(true);
    expect(isDue("2026-10-01", "2026-09-30")).toBe(false);
  });

  it("maps errors", () => {
    expect(scheduledErrorMessage("scheduled_invalid_dates").field).toBe("endsOn");
    expect(scheduledErrorMessage("scheduled_inactive").message).toBe(SCHEDULED_MESSAGES.inactive);
    expect(scheduledErrorMessage("transaction_invalid_category").field).toBe("categoryId");
  });
});

describe("reminderDate", () => {
  it("subtracts days across month boundaries", () => {
    expect(reminderDate("2026-10-10", 2)).toBe("2026-10-08");
    expect(reminderDate("2026-03-01", 1)).toBe("2026-02-28");
    expect(reminderDate("2026-10-10", 0)).toBe("2026-10-10");
  });
});
