import { useCallback, useEffect, useState } from 'react';

import { lockAdmin } from '@/lib/adminCode.js';

let clientPromise;
const getClient = () => {
  clientPromise ??= import('@/lib/supabase/client.js').then((module) => module.supabase);
  return clientPromise;
};

/**
 * Whether anyone is signed in, and a way to sign out — for the header.
 *
 * Deliberately lighter than useAuth: the header is on every page, and it only
 * needs to know WHETHER there is a session, not whose profile it is. So this
 * reads the session the client already holds and listens for changes, and
 * never queries public.profiles.
 */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    let subscription;
    getClient().then((supabase) => {
      if (!alive || !supabase) return;
      supabase.auth.getSession().then(({ data }) => {
        if (alive) setSignedIn(Boolean(data.session?.user));
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (alive) setSignedIn(Boolean(session?.user));
      });
      subscription = data.subscription;
    });
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    /* The staff gate shuts first, exactly as useAuth's sign-out does, so a
       shared machine is never left one login away from an open desk. */
    lockAdmin();
    const supabase = await getClient();
    if (supabase) await supabase.auth.signOut();
  }, []);

  return { signedIn, signOut };
}
