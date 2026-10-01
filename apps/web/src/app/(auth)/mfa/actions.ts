"use server";

import { AUTH_MESSAGES, fieldErrors, mfaCodeSchema, safeRedirectPath } from "@fin/shared";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../actions";

export async function verifyMfa(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp[0];
  if (!factor) redirect("/");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data.code });
  if (error) return { error: AUTH_MESSAGES.invalidMfaCode };

  const next = formData.get("next");
  redirect(safeRedirectPath(typeof next === "string" ? next : null));
}
