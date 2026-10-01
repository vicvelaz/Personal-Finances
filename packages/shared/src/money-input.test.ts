import { describe, expect, it } from "vitest";
import { parseMoneyInput } from "./money-input";

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

  it.each(["", "abc", "12,345,6", "1,2,3", "12.345,678", "1.23.4", "12,", "--1", "1e3", "12.3.4,5", "12345.6789"])(
    "rejects %s",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );
});
