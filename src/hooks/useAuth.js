import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client.js';

/**
 * Session plus the caller's own profile row.
 *
 * The role is ALWAYS read from public.profiles, which is protected by RLS —
 * never from localStorage and never from a form field. A client-side guard is
 * a navigation convenience; the database policies remain the enforcement
 * layer, and this code is written as if the guard could be bypassed.
 *
 * `status` is one of: 'loading' | 'anon' | 'ready' | 'error'.
 */
export function useAuth() {
  // Initialised, not corrected in an effect: with no client configured the
  // first render is already the settled anonymous state.
  const [state, setState] = useState(() => ({
    status: supabase ? 'loading' : 'anon',
    user: null,
    profile: null,
  }));

  const load = useCallback(async (user) => {
    if (!user) {
      setState({ status: 'anon', user: null, profile: null });
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, account_status, full_name, company_name, phone, country, email')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[NGD] profile lookup failed:', error);
      setState({ status: 'error', user, profile: null });
      return;
    }
    setState({ status: 'ready', user, profile: data ?? null });
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (alive) load(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) load(session?.user ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  // Fail closed: only an explicitly active admin counts. Any other status —
  // pending, suspended, unknown — resolves to false.
  const isAdmin =
    state.status === 'ready' &&
    state.profile?.role === 'admin' &&
    state.profile?.account_status === 'active';

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  return { ...state, isAdmin, signOut };
}
