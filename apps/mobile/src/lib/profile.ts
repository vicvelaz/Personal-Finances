import type { ProfileUpdate } from '@fin/shared';
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export type Profile = {
  display_name: string | null;
  base_currency: string;
  locale: string;
  timezone: string;
};

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, base_currency, locale, timezone')
        .eq('id', userId!)
        .single<Profile>();
      if (error) throw error;
      return data;
    },
  });
}

export async function updateProfile(userId: string, values: ProfileUpdate) {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: values.displayName,
      base_currency: values.baseCurrency,
      locale: values.locale,
      timezone: values.timezone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}
