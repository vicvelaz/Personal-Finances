import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type SessionState = { session: Session | null; isLoading: boolean; needsMfa: boolean };

const SessionContext = createContext<SessionState>({ session: null, isLoading: true, needsMfa: false });

/** Verified factor but the access token is still aal1. Computed locally: no Supabase calls inside auth callbacks. */
function needsMfa(session: Session | null): boolean {
  if (!session?.user.factors?.some((f) => f.status === 'verified')) return false;
  const part = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  return payload.aal !== 'aal2';
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true, needsMfa: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, isLoading: false, needsMfa: needsMfa(data.session) });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false, needsMfa: needsMfa(session) });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession() {
  return use(SessionContext);
}
