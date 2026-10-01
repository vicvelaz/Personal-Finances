"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { type FormState, resetPassword } from "../actions";
import { T } from "@/components/i18n-provider";

export function ResetPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold"><T id="auth.newPassword" /></h1>
      <FormAlert error={state.error} />
      <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" error={state.errors?.password} />
      <Field label="Repite la contraseña" name="confirmPassword" type="password" autoComplete="new-password" error={state.errors?.confirmPassword} />
      <p className="text-xs text-neutral-500"><T id="common.least8CharactersIncludingOneLetterOneNumber" /></p>
      <SubmitButton><T id="auth.savePassword" /></SubmitButton>
    </form>
  );
}
