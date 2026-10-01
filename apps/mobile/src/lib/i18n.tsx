import { createContext, use, useEffect, useState } from 'react';

import { setCurrentLocale } from '@fin/shared';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

type LocaleContextValue = { locale: string; setLocale: (locale: string) => void };

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'es-ES',
  setLocale: () => undefined,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  const initialLocale = /^en(?:-|$)/i.test(systemLocale) ? 'en-US' : /^es(?:-|$)/i.test(systemLocale) ? systemLocale : 'es-ES';
  const [profileLocale, setProfileLocale] = useState<{ userId: string; locale: string } | null>(null);
  const locale = userId && profileLocale?.userId === userId ? profileLocale.locale : initialLocale;

  useEffect(() => {
    let active = true;
    if (!userId) return () => {
      active = false;
    };

    supabase
      .from('profiles')
      .select('locale')
      .eq('id', userId)
      .maybeSingle<{ locale: string }>()
      .then(({ data }) => {
        if (active && data?.locale) setProfileLocale({ userId, locale: data.locale });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const setLocale = (nextLocale: string) => {
    if (userId) setProfileLocale({ userId, locale: nextLocale });
  };

  useEffect(() => setCurrentLocale(locale), [locale]);

  return <LocaleContext value={{ locale, setLocale }}>{children}</LocaleContext>;
}

export function useLocale() {
  return use(LocaleContext);
}