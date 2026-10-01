"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "../actions";
import { verifyMfa } from "./actions";
import { T } from "@/components/i18n-provider";

export function MfaForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyMfa, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <h1 className="text-xl font-semibold"><T id="security.twoStepVerification" /></h1>
      <p className="text-sm text-neutral-500"><T id="security.enter6DigitCodeAuthenticatorApp" /></p>
      <FormAlert error={state.error} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Código" name="code" autoComplete="one-time-code" error={state.errors?.code} />
      <SubmitButton><T id="common.verify" /></SubmitButton>
    </form>
  );
}
