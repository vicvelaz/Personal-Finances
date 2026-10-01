import { describe, expect, it } from "vitest";
import { deleteAccountSchema, toCsv } from "./data-rights";

describe("toCsv", () => {
  it("writes BOM, header and rows with separator", () => {
    expect(toCsv(["a", "b"], [["x", 1.5]])).toBe("\uFEFFa;b\r\nx;1.5\r\n");
  });

  it("quotes separators, quotes and newlines", () => {
    expect(toCsv(["a"], [['di "hola"; ya\nno']])).toContain('"di ""hola""; ya\nno"');
  });

  it("neutralises formula injection in text but not numbers", () => {
    const csv = toCsv(["a", "b", "c"], [["=cmd|' /C calc'!A0", "@SUM(1)", -12.5]]);
    expect(csv).toContain(`"'=cmd|' /C calc'!A0"`);
    expect(csv).toContain(`"'@SUM(1)"`);
    expect(csv).toContain(";-12.5");
  });

  it("leaves empty cells for null", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("\uFEFFa;b\r\n;\r\n");
  });
});

describe("deleteAccountSchema", () => {
  it("requires the exact confirmation word and a password", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "BORRAR", password: "x" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirmation: "borrar", password: "x" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmation: "BORRAR", password: "" }).success).toBe(false);
  });
});
