import { describe, expect, it } from "vitest";
import { isValidTimeZone, profileUpdateSchema } from "./profile";

const valid = {
  displayName: "Ana",
  baseCurrency: "EUR",
  locale: "es-ES",
  timezone: "Europe/Madrid",
};

describe("profileUpdateSchema", () => {
  it("accepts valid data", () => {
    expect(profileUpdateSchema.parse(valid)).toEqual(valid);
  });

  it("turns an empty display name into null", () => {
    expect(profileUpdateSchema.parse({ ...valid, displayName: "  " }).displayName).toBeNull();
  });

  it.each([
    ["long name", { displayName: "x".repeat(81) }, "displayName"],
    ["unsupported currency", { baseCurrency: "BTC" }, "baseCurrency"],
    ["unsupported locale", { locale: "fr-FR" }, "locale"],
    ["invalid timezone", { timezone: "Mars/Olympus" }, "timezone"],
  ])("rejects %s", (_, patch, field) => {
    const r = profileUpdateSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual([field]);
  });
});

describe("isValidTimeZone", () => {
  it("validates IANA identifiers", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("Nowhere/City")).toBe(false);
  });
});
