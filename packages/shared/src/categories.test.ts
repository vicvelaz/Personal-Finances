import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import {
  buildCategoryTree,
  CATEGORY_MESSAGES,
  categoryCreateSchema,
  categoryErrorMessage,
  type CategoryRow,
} from "./categories";

const valid = { name: " Gasolina ", kind: "expense", parentId: "", color: "" };

describe("categoryCreateSchema", () => {
  it("normalises empty optional fields to null", () => {
    expect(categoryCreateSchema.parse(valid)).toEqual({ name: "Gasolina", kind: "expense", parentId: null, color: null });
  });

  it("accepts a parent uuid and hex color", () => {
    const r = categoryCreateSchema.parse({
      ...valid,
      parentId: "1e6a96f3-bb4b-4853-8f94-66d6b45cb991",
      color: "#22c55e",
    });
    expect(r.parentId).toBe("1e6a96f3-bb4b-4853-8f94-66d6b45cb991");
    expect(r.color).toBe("#22c55e");
  });

  it.each([
    ["empty name", { name: "" }, "name"],
    ["long name", { name: "x".repeat(41) }, "name"],
    ["bad kind", { kind: "transfer" }, "kind"],
    ["bad parent", { parentId: "nope" }, "parentId"],
    ["bad color", { color: "red" }, "color"],
  ])("rejects %s", (_, patch, field) => {
    const r = categoryCreateSchema.safeParse({ ...valid, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBeDefined();
  });
});

describe("categoryErrorMessage", () => {
  it("maps database errors", () => {
    expect(categoryErrorMessage("23505", "dup")).toEqual({ field: "name", message: CATEGORY_MESSAGES.duplicate });
    expect(categoryErrorMessage("P0001", "category_invalid_parent").field).toBe("parentId");
    expect(categoryErrorMessage("P0001", "category_has_children").message).toBe(CATEGORY_MESSAGES.hasChildren);
    expect(categoryErrorMessage("42501", "x").message).toBe(CATEGORY_MESSAGES.unexpected);
  });
});

describe("buildCategoryTree", () => {
  const row = (id: string, name: string, kind: "expense" | "income", parent_id: string | null = null): CategoryRow => ({
    id,
    name,
    kind,
    parent_id,
    color: null,
  });

  it("groups by kind, nests children and sorts by name", () => {
    const tree = buildCategoryTree([
      row("1", "Transporte", "expense"),
      row("2", "Alimentación", "expense"),
      row("3", "Supermercado", "expense", "2"),
      row("4", "Restaurantes", "expense", "2"),
      row("5", "Nómina", "income"),
    ]);
    expect(tree.expense.map((n) => n.name)).toEqual(["Alimentación", "Transporte"]);
    expect(tree.expense[0]!.children.map((c) => c.name)).toEqual(["Restaurantes", "Supermercado"]);
    expect(tree.income.map((n) => n.name)).toEqual(["Nómina"]);
  });
});
