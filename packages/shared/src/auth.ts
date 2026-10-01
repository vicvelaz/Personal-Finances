import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Introduce un email válido" }));

// 72 is the bcrypt input limit used by Supabase Auth.
export const passwordSchema = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres" })
  .max(72, { error: "La contraseña no puede superar 72 caracteres" })
  .regex(/[A-Za-z]/, { error: "La contraseña debe contener al menos una letra" })
  .regex(/\d/, { error: "La contraseña debe contener al menos un número" });

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Introduce tu contraseña" }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** 6-digit one-time code (email OTP or TOTP). */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "Introduce el código de 6 dígitos" });

export const mfaCodeSchema = z.object({ code: otpCodeSchema });

export const verifyEmailCodeSchema = z.object({
  email: emailSchema,
  token: otpCodeSchema,
});

export const recoverWithCodeSchema = z
  .object({
    email: emailSchema,
    token: otpCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const AUTH_MESSAGES = {
  invalidCredentials: "Email o contraseña incorrectos",
  emailNotConfirmed: "Debes confirmar tu email antes de iniciar sesión",
  signUpSent: "Revisa tu correo para confirmar tu cuenta",
  resetSent:
    "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña",
  unexpected: "Ha ocurrido un error. Inténtalo de nuevo",
  signUpCodeSent: "Te hemos enviado un código de 6 dígitos a tu correo",
  resetCodeSent: "Si existe una cuenta con ese email, recibirás un código para restablecer tu contraseña",
  invalidEmailCode: "Código incorrecto o caducado",
  invalidMfaCode: "Código incorrecto",
  mfaEnabled: "Verificación en dos pasos activada",
  mfaDisabled: "Verificación en dos pasos desactivada",
  oauthFailed: "No se pudo iniciar sesión con Google",
} as const;

/** Maps a Supabase Auth sign-in error code to a message that never reveals whether the email exists. */
export function signInErrorMessage(code: string | undefined): string {
  return code === "email_not_confirmed"
    ? AUTH_MESSAGES.emailNotConfirmed
    : AUTH_MESSAGES.invalidCredentials;
}

/** First error message per field, for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
