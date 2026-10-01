import { describe, expect, it } from "vitest";
import { formatMonth, isValidIsoDate, monthRange, shiftMonth, todayInTimeZone } from "./dates";

describe("dates", () => {
  it("computes today in a time zone", () => {
    const instant = new Date("2026-09-30T23:30:00Z");
    expect(todayInTimeZone("Europe/Madrid", instant)).toBe("2026-10-01");
    expect(todayInTimeZone("America/Mexico_City", instant)).toBe("2026-09-30");
  });

  it("validates real dates", () => {
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("30/09/2026")).toBe(false);
  });

  it("returns inclusive month ranges", () => {
    expect(monthRange("2026-09")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-13")).toBeNull();
    expect(monthRange("x")).toBeNull();
  });

  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("formats months", () => {
    expect(formatMonth("2026-09", "es-ES")).toBe("Septiembre de 2026");
  });
});
