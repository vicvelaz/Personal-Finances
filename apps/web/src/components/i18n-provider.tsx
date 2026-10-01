"use client";

import {
  getLanguage,
  setCurrentLocale,
  translate,
  translateKey,
  type TranslationKey,
} from "@fin/shared";
import { createContext, useContext, useEffect } from "react";

const LocaleContext = createContext("es-ES");

export function I18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    setCurrentLocale(locale);
    document.documentElement.lang = getLanguage(locale);
  }, [locale]);

  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useTranslations() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (message: string, values?: Record<string, string | number>) =>
      translate(locale, message, values),
    tKey: (key: TranslationKey, values?: Record<string, string | number>) =>
      translateKey(locale, key, values),
  };
}

type TProps =
  | {
      id: TranslationKey;
      children?: never;
      values?: Record<string, string | number>;
    }
  | { id?: never; children: string; values?: Record<string, string | number> };

export function T({ children, id, values }: TProps) {
  const { t, tKey } = useTranslations();
  return id ? tKey(id, values) : t(children ?? "", values);
}
