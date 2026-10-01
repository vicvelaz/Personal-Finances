"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { type FormState, forgotPassword } from "../actions";
import { T } from "@/components/i18n-provider";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold"><T id="auth.recoverPassword" /></h1>
      <FormAlert error={state.error} message={state.message} />
      {!state.message && (
        <>
          <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
          <SubmitButton><T id="common.sendLink" /></SubmitButton>
        </>
      )}
      <Link href="/login" className="text-sm underline"><T id="auth.backSign" /></Link>
    </form>
  );
}
