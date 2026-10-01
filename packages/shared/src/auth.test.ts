import { describe, expect, it } from "vitest";
import {
  AUTH_MESSAGES,
  fieldErrors,
  otpCodeSchema,
  recoverWithCodeSchema,
  resetPasswordSchema,
  signInErrorMessage,
  signInSchema,
  signUpSchema,
  verifyEmailCodeSchema,
} from "./auth";

describe("signUpSchema", () => {
  it("accepts a valid email and password and normalises the email", () => {
    const r = signUpSchema.parse({ email: "  Ana@Example.COM ", password: "abc12345" });
    expect(r.email).toBe("ana@example.com");
  });

  it.each([
    ["short", "abc123"],
    ["no digit", "abcdefgh"],
    ["no letter", "12345678"],
    ["too long", `a1${"x".repeat(71)}`],
  ])("rejects password: %s", (_, password) => {
    const r = signUpSchema.safeParse({ email: "a@b.co", password });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toBeDefined();
  });

  it("rejects a malformed email", () => {
    const r = signUpSchema.safeParse({ email: "nope", password: "abc12345" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toBe("Introduce un email válido");
  });
});

describe("signInSchema", () => {
  it("requires a password but not its strength", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects mismatched confirmation on confirmPassword", () => {
    const r = resetPasswordSchema.safeParse({ password: "abc12345", confirmPassword: "abc12346" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirmPassword).toBeDefined();
  });
});

describe("signInErrorMessage", () => {
  it("only distinguishes unconfirmed email", () => {
    expect(signInErrorMessage("email_not_confirmed")).toBe(AUTH_MESSAGES.emailNotConfirmed);
    expect(signInErrorMessage("invalid_credentials")).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(signInErrorMessage("user_not_found")).toBe(AUTH_MESSAGES.invalidCredentials);
    expect(signInErrorMessage(undefined)).toBe(AUTH_MESSAGES.invalidCredentials);
  });
});

describe("one-time codes", () => {
  it("accepts exactly 6 digits, trimming spaces", () => {
    expect(otpCodeSchema.parse(" 123456 ")).toBe("123456");
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
    expect(otpCodeSchema.safeParse("1234567").success).toBe(false);
  });

  it("verifyEmailCodeSchema normalises the email", () => {
    expect(verifyEmailCodeSchema.parse({ email: "Ana@X.com", token: "000111" }).email).toBe("ana@x.com");
  });

  it("recoverWithCodeSchema requires matching strong passwords", () => {
    const base = { email: "a@x.com", token: "123456", password: "nueva1234" };
    expect(recoverWithCodeSchema.safeParse({ ...base, confirmPassword: "nueva1234" }).success).toBe(true);
    const r = recoverWithCodeSchema.safeParse({ ...base, confirmPassword: "otra1234" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirmPassword).toBeDefined();
    expect(recoverWithCodeSchema.safeParse({ ...base, password: "corta1", confirmPassword: "corta1" }).success).toBe(false);
  });
});
