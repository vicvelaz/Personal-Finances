import { describe, expect, it } from "vitest";
import {
  formatManualDate,
  formatMonth,
  isValidIsoDate,
  maskManualDateInput,
  monthRange,
  parseManualDate,
  shiftMonth,
  todayInTimeZone,
} from "./dates";

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

  it("converts manual dates across month and year boundaries without timezone shifts", () => {
    expect(parseManualDate("31/12/2026")).toBe("2026-12-31");
    expect(parseManualDate("01/01/2027")).toBe("2027-01-01");
    expect(formatManualDate("2027-01-01")).toBe("01/01/2027");
    expect(parseManualDate("31/02/2026")).toBeNull();
    expect(parseManualDate("1/1/2027")).toBeNull();
    expect(formatManualDate("2027-02-29")).toBeNull();
  });

  it("masks typed and pasted digits as DD/MM/YYYY", () => {
    expect(maskManualDateInput("15102026")).toBe("15/10/2026");
    expect(maskManualDateInput("15/10/2026")).toBe("15/10/2026");
    expect(maskManualDateInput("1510")).toBe("15/10");
    expect(parseManualDate(maskManualDateInput("31022026"))).toBeNull();
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
