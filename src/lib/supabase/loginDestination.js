/**
 * Where a fresh session should land: the desk for an active administrator,
 * the account page for everyone else, sign-in if there is no session.
 *
 * Navigation only. The admin route re-reads the role, the desk asks for the
 * staff code, and RLS enforces every query — a wrong answer here costs one
 * redirect, never access.
 */
export async function loginDestination(client, session) {
  if (!session?.user?.id) return '/login';
  try {
    const { data, error } = await client.from('profiles')
      .select('role, account_status').eq('id', session.user.id).maybeSingle();
    if (!error && data?.role === 'admin' && data?.account_status === 'active') return '/admin';
  } catch {
    // The account page can report profile lookup failures and offer sign-out.
  }
  return '/account';
}
