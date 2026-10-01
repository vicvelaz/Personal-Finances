"use server";

import { AUTH_MESSAGES, fieldErrors, mfaCodeSchema } from "@fin/shared";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EnrollState = { factorId?: string; qrCode?: string; secret?: string; error?: string };
export type MfaState = { errors?: Record<string, string>; error?: string; message?: string };

export async function enrollMfa(): Promise<EnrollState> {
  const supabase = await createClient();
  // Drop abandoned enrollments so they never pile up.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "fin" });
  if (error) return { error: AUTH_MESSAGES.unexpected };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmMfa(_: MfaState, formData: FormData): Promise<MfaState> {
  const parsed = mfaCodeSchema.safeParse({ code: formData.get("code") ?? "" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const factorId = String(formData.get("factorId") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data.code });
  if (error) return { errors: { code: AUTH_MESSAGES.invalidMfaCode } };
  revalidatePath("/profile");
  return { message: AUTH_MESSAGES.mfaEnabled };
}

export async function disableMfa(_: MfaState, formData: FormData): Promise<MfaState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: String(formData.get("factorId") ?? "") });
  if (error) return { error: AUTH_MESSAGES.unexpected };
  revalidatePath("/profile");
  return { message: AUTH_MESSAGES.mfaDisabled };
}
