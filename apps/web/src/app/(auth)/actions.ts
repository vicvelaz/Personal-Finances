"use server";

import {
  AUTH_MESSAGES,
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  safeRedirectPath,
  signInErrorMessage,
  signInSchema,
  signUpSchema,
} from "@fin/shared";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  errors?: Record<string, string>;
  error?: string;
  message?: string;
  values?: Record<string, string>;
};

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const parsed = signInSchema.safeParse({ email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: signInErrorMessage(error.code), values: { email } };

  const next = safeRedirectPath(str(formData, "next"));
  if (data.user.factors?.some((f) => f.status === "verified")) {
    redirect(`/mfa?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const parsed = signUpSchema.safeParse({ email, password: str(formData, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  // With email confirmation on, an existing email returns no error, so the response stays neutral.
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    if (error.code === "weak_password") {
      return { errors: { password: error.message }, values: { email } };
    }
    return { error: AUTH_MESSAGES.unexpected, values: { email } };
  }
  return { message: AUTH_MESSAGES.signUpSent };
}

export async function forgotPassword(_: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { email } };

  const supabase = await createClient();
  // Errors are ignored on purpose so the response never reveals whether the account exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email);
  return { message: AUTH_MESSAGES.resetSent };
}

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: str(formData, "password"),
    confirmPassword: str(formData, "confirmPassword"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password" || error.code === "same_password") {
      return { errors: { password: error.message } };
    }
    return { error: AUTH_MESSAGES.unexpected };
  }
  redirect("/");
}

export async function signInWithGoogle(formData: FormData) {
  // Next.js rejects Server Actions whose Origin does not match the host, so this is the app origin.
  const origin = (await headers()).get("origin");
  const next = safeRedirectPath(str(formData, "next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
