"use server";

import { AUTH_MESSAGES, deleteAccountSchema, fieldErrors, otpCodeSchema } from "@fin/shared";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountState = { errors?: Record<string, string>; error?: string; confirmation?: string };

export async function deleteAccount(_: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    password: formData.get("password"),
  });
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!parsed.success) return { errors: fieldErrors(parsed.error), confirmation };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  const code = otpCodeSchema.safeParse(formData.get("code") ?? "");
  if (factor && !code.success) return { errors: { code: code.error.issues[0].message }, confirmation };

  // Re-authenticate so an unattended open session cannot delete the account.
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
  if (authError) return { errors: { password: "Contraseña incorrecta" }, confirmation };

  // Password sign-in drops the session to aal1, so users with MFA must step up again.
  if (factor && code.success) {
    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
    if (mfaError) return { errors: { code: AUTH_MESSAGES.invalidMfaCode }, confirmation };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: AUTH_MESSAGES.unexpected, confirmation };
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
