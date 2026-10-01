import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it.each(["/", "/profile", "/reset-password?x=1"])("keeps internal path %s", (p) => {
    expect(safeRedirectPath(p)).toBe(p);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "evil.com",
    "/foo\nbar",
  ])("falls back for %s", (p) => {
    expect(safeRedirectPath(p, "/home")).toBe("/home");
  });
});
