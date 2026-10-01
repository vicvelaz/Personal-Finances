"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "@/components/i18n-provider";
import type { TranslationKey } from "@fin/shared";

type LocalizedLabel =
  | { label: string; labelKey?: never }
  | { label?: never; labelKey: TranslationKey };

export function Field({
  label,
  labelKey,
  name,
  type = "text",
  error,
  defaultValue,
  autoComplete,
  children,
}: LocalizedLabel & {
  name: string;
  type?: string;
  error?: string;
  defaultValue?: string | null;
  autoComplete?: string;
  children?: React.ReactNode;
}) {
  const id = `field-${name}`;
  const { t, tKey } = useTranslations();
  const labelText = labelKey ? tKey(labelKey) : t(label ?? "");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {labelText}
      </label>
      {children ?? (
        <input
          id={id}
          name={name}
          type={type}
          defaultValue={defaultValue ?? undefined}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {t(error)}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const { t } = useTranslations();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? t("Enviando…") : typeof children === "string" ? t(children) : children}
    </button>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  const { t } = useTranslations();
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
        {t(error)}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-200">
        {t(message)}
      </p>
    );
  }
  return null;
}
