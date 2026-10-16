import { describe, expect, it } from "vitest";
import { isValidPositiveMoneyDraft, parseMoneyInput, parsePositiveMoneyInput } from "./money-input";

describe("parseMoneyInput", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12,5", 1250],
    ["12.5", 1250],
    ["12,05", 1205],
    ["1.250,50", 125050],
    ["1,250.50", 125050],
    ["1.250", 125000],
    ["1,250", 125000],
    ["1.234.567", 123456700],
    ["1 234,56", 123456],
    ["-30", -3000],
    ["−30,5", -3050],
    ["+7", 700],
    [",5", 50],
    ["-0", 0],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  describe("strict positive money input", () => {
    it.each([
      ["1250,50", 125050],
      ["1250.50", 125050],
      [",5", 50],
      ["12", 1200],
    ])("parses %s into minor units", (input, expected) => {
      expect(parsePositiveMoneyInput(input)).toBe(expected);
    });

    it.each(["", "0", "0.00", "-1", "+1", "1.250,50", "12.345", "1.2.3", "12,"] )(
      "does not produce a positive amount for %s",
      (input) => {
        expect(parsePositiveMoneyInput(input)).toBeNull();
      },
    );

    it("accepts editable drafts but rejects invalid typing or pasted text", () => {
      expect(isValidPositiveMoneyDraft("")).toBe(true);
      expect(isValidPositiveMoneyDraft("1250,")).toBe(true);
      expect(isValidPositiveMoneyDraft("1250,50")).toBe(true);
      for (const input of ["12,3,4", "-12", "1.234,50", "12abc", "1e3"]) {
        expect(isValidPositiveMoneyDraft(input)).toBe(false);
      }
    });
  });

  it.each(["", "abc", "12,345,6", "1,2,3", "12.345,678", "1.23.4", "12,", "--1", "1e3", "12.3.4,5", "12345.6789"])(
    "rejects %s",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );
});
