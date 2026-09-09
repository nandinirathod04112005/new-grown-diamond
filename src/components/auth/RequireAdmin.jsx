import { useRef, useState } from 'react';

import { useAuth } from '@/hooks/useAuth.js';
import { isAdminCode, isAdminUnlocked, unlockAdmin } from '@/lib/adminCode.js';
import styles from './RequireAdmin.module.css';

/**
 * Renders its children only for an active admin who has entered the code.
 *
 * TWO CHECKS, AND THEY ARE NOT EQUALS.
 *
 * The role is the real one. It comes from public.profiles under row-level
 * security, it is re-read on every mount, and it is what the database itself
 * enforces on every query the desk makes. Nothing on this screen can talk it
 * round.
 *
 * The code is the second, and it is a lock on the door rather than a claim
 * about who is standing at it — see the note in lib/adminCode.js for why a
 * value shipped in the bundle can only ever withhold and never grant. The
 * order below matters: the role is checked FIRST, so someone who is not an
 * administrator is turned away whether or not they know the code, and never
 * learns whether the code they tried was right.
 *
 * Fails closed, and shows a real loading state rather than a blank screen
 * while the profile resolves — a guarded page that flashes empty reads as
 * broken even when it is behaving correctly.
 */
export default function RequireAdmin({ children }) {
  const { status, isAdmin, profile } = useAuth();
  // Read once at mount, then owned by this component: the gate should not
  // re-open by itself because something else touched storage.
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked());
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);

  const codeField = useRef(null);

  function submitCode(event) {
    event.preventDefault();
    if (!isAdminCode(code)) {
      setWrong(true);
      /*
       * The value is KEPT and selected, not wiped. Emptying a masked field
       * after a mistake forces a blind retype of something the person cannot
       * see; selecting it lets them either type over it or correct one
       * character. Focus goes back to the field for the same reason — the
       * button that was pressed is not where the next keystroke belongs.
       */
      requestAnimationFrame(() => { codeField.current?.focus(); codeField.current?.select(); });
      return;
    }
    unlockAdmin();
    setUnlocked(true);
  }

  if (status === 'loading') {
    return (
      <main className={styles.gate} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <p>Checking your access…</p>
      </main>
    );
  }

  if (status === 'anon') {
    return (
      <main className={styles.gate}>
        <h1>Sign in required</h1>
        <p>This area is for New Grown Diamond staff.</p>
        <a className={styles.action} href="/login">Go to sign in</a>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.gate}>
        <h1>No access</h1>
        <p>
          {profile
            ? 'This account is not an active administrator.'
            : 'We could not load your account details. Please contact support.'}
        </p>
        <a className={styles.action} href="/">Back to the site</a>
      </main>
    );
  }

  /*
   * Only reached by someone the database already accepts as an active
   * administrator. That is why this asks for the code rather than the identity
   * — the identity question has been answered above.
   */
  if (!unlocked) {
    return (
      <main className={styles.gate}>
        <h1>Staff code</h1>
        <p>Enter the access code to open the inventory desk.</p>
        <form className={styles.codeForm} onSubmit={submitCode}>
          <label className="u-visually-hidden" htmlFor="admin-code">Staff access code</label>
          <input
            id="admin-code"
            ref={codeField}
            className={styles.codeInput}
            type="password"
            value={code}
            autoComplete="off"
            inputMode="numeric"
            aria-invalid={wrong ? 'true' : undefined}
            aria-describedby="admin-code-note"
            /* eslint-disable-next-line jsx-a11y/no-autofocus -- this is the only
               control on the page and the whole reason it rendered. */
            autoFocus
            placeholder="••••••"
            onChange={(e) => { setCode(e.target.value); setWrong(false); }}
          />
          <button className={styles.action} type="submit">Unlock</button>
        </form>
        {/*
          One live region, mounted from the start. A region that only appears
          when there is an error is exactly the one assistive technology is
          least likely to announce — the announcement is triggered by content
          CHANGING inside a region that already exists. So the element is
          always here and only its text swaps.
        */}
        <p id="admin-code-note" className={styles.codeNote} role="status" aria-live="polite">
          {wrong
            ? 'That code is not correct.'
            : 'The desk locks itself again when this tab is closed.'}
        </p>
      </main>
    );
  }

  return children;
}
