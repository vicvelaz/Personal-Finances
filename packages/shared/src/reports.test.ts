import { describe, expect, it } from "vitest";
import { groupTopCategories, netSavings } from "./reports";

describe("groupTopCategories", () => {
  const row = (id: string | null, total: number) => ({ category_id: id, name: id, color: null, total });

  it("sorts, names uncategorised and folds the tail into Otros", () => {
    const result = groupTopCategories([row("a", 10), row(null, 50), row("b", 30), row("c", 5), row("d", 0)], 2);
    expect(result.map((r) => [r.name, r.total])).toEqual([
      ["Sin categoría", 50],
      ["b", 30],
      ["Otros", 15],
    ]);
  });

  it("returns everything when under the limit", () => {
    expect(groupTopCategories([row("a", 1)])).toHaveLength(1);
  });
});

describe("netSavings", () => {
  it("subtracts expenses from income", () => {
    expect(netSavings(200000, 125000)).toBe(75000);
  });
});
