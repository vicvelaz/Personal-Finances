"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { type FormState, signUp } from "../actions";
import { T } from "@/components/i18n-provider";

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  if (state.message) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert message={state.message} />
        <Link href="/login" className="text-sm underline"><T id="auth.backSign" /></Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold"><T id="accounts.createAccount" /></h1>
      <FormAlert error={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
      <Field label="Contraseña" name="password" type="password" autoComplete="new-password" error={state.errors?.password} />
      <p className="text-xs text-neutral-500"><T id="common.least8CharactersIncludingOneLetterOneNumber" /></p>
      <SubmitButton><T id="auth.signUpButton" /></SubmitButton>
      <p className="text-sm">
        <T id="accounts.alreadyAccount" /> <Link href="/login" className="underline"><T id="auth.sign" /></Link>
      </p>
    </form>
  );
}
