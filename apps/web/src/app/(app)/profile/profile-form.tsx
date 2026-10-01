"use client";

import { SUPPORTED_CURRENCIES, SUPPORTED_LOCALES, translate } from "@fin/shared";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import { T, useTranslations } from "@/components/i18n-provider";
import { type ProfileFormState, updateProfile } from "./actions";

export type ProfileValues = {
  email: string;
  displayName: string | null;
  baseCurrency: string;
  locale: string;
  timezone: string;
};

const selectClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const [state, action] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const { locale } = useTranslations();
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormAlert error={state.error} message={state.message} />
      <Field labelKey="auth.email" name="email">
        <input id="field-email" value={profile.email} readOnly disabled className={`${selectClass} opacity-70`} />
      </Field>
      <Field label="Nombre visible" name="displayName" defaultValue={profile.displayName} error={state.errors?.displayName} />
      <Field labelKey="profile.baseCurrency" name="baseCurrency" error={state.errors?.baseCurrency}>
        <select id="field-baseCurrency" name="baseCurrency" defaultValue={profile.baseCurrency} className={selectClass}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field labelKey="profile.languageRegionalFormat" name="locale" error={state.errors?.locale}>
        <select id="field-locale" name="locale" defaultValue={profile.locale} className={selectClass}>
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>{translate(locale, localeLabels[l])}</option>
          ))}
        </select>
      </Field>
      <Field label="Zona horaria" name="timezone" defaultValue={profile.timezone} error={state.errors?.timezone} />
      <SubmitButton><T id="common.save" /></SubmitButton>
    </form>
  );
}

const localeLabels: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  "es-ES": "Español (España)",
  "es-MX": "Español (México)",
  "es-AR": "Español (Argentina)",
  "es-CO": "Español (Colombia)",
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
};
