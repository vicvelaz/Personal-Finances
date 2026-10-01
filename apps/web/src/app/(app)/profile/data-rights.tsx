"use client";

import { DELETE_CONFIRMATION } from "@fin/shared";
import { useActionState } from "react";
import { Field, FormAlert } from "@/components/form";
import { useTranslations } from "@/components/i18n-provider";
import { type DeleteAccountState, deleteAccount } from "./data-actions";
import { T } from "@/components/i18n-provider";

export function DataRights({ mfa }: { mfa: boolean }) {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const { t } = useTranslations();
  return (
    <section className="flex flex-col gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800" aria-label={t("Tus datos")}>
      <h2 className="text-lg font-medium"><T id="dataRights.data" /></h2>
      <div className="flex flex-wrap gap-3 text-sm">
        <a href="/api/export?format=json" className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700">
          <T id="dataRights.downloadDataJson" />
        </a>
        <a href="/api/export?format=csv" className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700">
          <T id="csvImport.downloadTransactionsCsv" />
        </a>
      </div>
      <form action={action} className="flex flex-col gap-3 rounded-md border border-red-300 p-4" noValidate aria-label={t("Borrar cuenta")}>
        <h3 className="font-medium text-red-700"><T id="dataRights.deleteAccount" /></h3>
        <p className="text-sm text-neutral-500">
          <T id="dataRights.accountAllDataPermanentlyDeletedActionUndone" />
        </p>
        <FormAlert error={state.error} />
        <Field
          label={`Escribe ${DELETE_CONFIRMATION} para confirmar`}
          name="confirmation"
          defaultValue={state.confirmation}
          error={state.errors?.confirmation}
        />
        <Field label="Contraseña actual" name="password" type="password" autoComplete="current-password" error={state.errors?.password} />
        {mfa && <Field label="Código de verificación" name="code" autoComplete="one-time-code" error={state.errors?.code} />}
        <button type="submit" disabled={pending} className="self-start rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          <T id="dataRights.permanentlyDeleteAccount" />
        </button>
      </form>
    </section>
  );
}
