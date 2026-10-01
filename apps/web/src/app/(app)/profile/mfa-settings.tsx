"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import { type EnrollState, type MfaState, confirmMfa, disableMfa, enrollMfa } from "./mfa-actions";
import { T } from "@/components/i18n-provider";

export function MfaSettings({ factorId }: { factorId: string | null }) {
  const { t } = useTranslations();
  return (
    <section className="flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800" aria-label={t("Verificación en dos pasos")}>
      <h2 className="text-lg font-medium"><T id="security.twoStepVerification" /></h2>
      {factorId ? <Disable factorId={factorId} /> : <Enroll />}
    </section>
  );
}

function Disable({ factorId }: { factorId: string }) {
  const [state, action] = useActionState<MfaState, FormData>(disableMfa, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormAlert error={state.error} />
      <p className="text-sm"><T id="security.enabledAuthenticatorApp" /></p>
      <input type="hidden" name="factorId" value={factorId} />
      <SubmitButton><T id="common.disable" /></SubmitButton>
    </form>
  );
}

function Enroll() {
  const { t } = useTranslations();
  const [enroll, startEnroll, enrolling] = useActionState<EnrollState>(enrollMfa, {});
  const [state, action] = useActionState<MfaState, FormData>(confirmMfa, {});

  if (state.message) return <FormAlert message={state.message} />;

  if (!enroll.factorId) {
    return (
      <form action={startEnroll} className="flex flex-col gap-3">
        <FormAlert error={enroll.error} />
        <p className="text-sm text-neutral-500"><T id="security.protectAccountRequiringAuthenticatorCodeSigning" /></p>
        <button type="submit" disabled={enrolling} className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          <T id="common.enable" />
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <p className="text-sm"><T id="security.scanQrCodeAuthenticatorAppEnterKeyManually" /></p>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL from Supabase */}
      <img src={enroll.qrCode} alt={t("Código QR para la app de autenticación")} width={180} height={180} className="rounded bg-white p-2" />
      <p className="break-all font-mono text-sm" aria-label={t("Clave secreta")}>{enroll.secret}</p>
      <input type="hidden" name="factorId" value={enroll.factorId} />
      <Field label="Código" name="code" autoComplete="one-time-code" error={state.errors?.code} />
      <SubmitButton><T id="common.confirm" /></SubmitButton>
    </form>
  );
}
