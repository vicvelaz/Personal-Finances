"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { type FormState, signIn } from "../actions";
import { T } from "@/components/i18n-provider";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold"><T id="auth.signInTitle" /></h1>
      <FormAlert error={state.error} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" error={state.errors?.password} />
      <SubmitButton><T id="auth.signInButton" /></SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="underline"><T id="auth.forgotPassword" /></Link>
        <Link href="/signup" className="underline"><T id="accounts.createAccount" /></Link>
      </div>
    </form>
  );
}
