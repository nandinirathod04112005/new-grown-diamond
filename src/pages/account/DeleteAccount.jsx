import { useId, useState } from 'react';

import { useCart } from '@/cart/useCart.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { createEnquiry } from '@/lib/supabase/queries/enquiries.js';
import { useWishlist } from '@/wishlist/useWishlist.js';
import COPY from './DeleteAccount.copy.js';
import styles from './DeleteAccount.module.css';

/**
 * Asking for the account to be deleted.
 *
 * A REQUEST, not a deletion, and deliberately so. Removing a sign-in from
 * Supabase needs the service-role key, which never ships to a browser, and
 * there is no server function for it yet; adding one is a database change
 * this site does not make on its own. So this sends the desk a request
 * through the ordinary enquiries table (the same insert the contact form
 * uses, carrying the signed-in user's id), clears what this device keeps for
 * the account (the selection and saved stones), and signs out. The team then
 * deletes the account from the Supabase dashboard.
 *
 * Typing the account's email is the confirmation: a single click on a red
 * button is too easy to make by accident for something that ends an account.
 * The request text is English whatever the page language, because the desk
 * reads it.
 */
export default function DeleteAccount({ user, profile, signOut }) {
  const c = useCopy(COPY);
  const cart = useCart();
  const wishlist = useWishlist();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [state, setState] = useState({ status: 'idle' }); // idle | sending | sent | error
  const ids = useId();

  const email = String(user?.email ?? '').trim();
  const matches = typed.trim().toLowerCase() === email.toLowerCase() && email !== '';

  async function send(event) {
    event.preventDefault();
    if (!matches || state.status === 'sending') return;
    setState({ status: 'sending' });
    try {
      const note = reason.trim();
      const id = await createEnquiry({
        fullName: String(profile?.full_name || email).slice(0, 160),
        email,
        subject: 'Account deletion request',
        message: `Please delete the account ${email} (user id ${user.id}) and the details stored with it.`
          + (note ? `\n\nReason given: ${note}` : ''),
      });
      setState({ status: 'sent', id });
      cart?.clear?.();
      wishlist?.clear?.();
      /* Long enough to read the reference, then out. */
      window.setTimeout(() => { signOut?.(); }, 3500);
    } catch (error) {
      console.error('[NGD account deletion]', error);
      setState({ status: 'error' });
    }
  }

  if (state.status === 'sent') {
    return (
      <section className={styles.panel} aria-labelledby={`${ids}-title`} data-motion="off">
        <h2 id={`${ids}-title`} className={styles.title}>{c.title}</h2>
        <p className={styles.sent} role="status">{interpolate(c.sent, { id: state.id })}</p>
      </section>
    );
  }

  /* data-motion="off": the form opens because the visitor asked for it, so
     it appears at once rather than being dealt in by the site-wide scroll
     entrance, which would slide the buttons as they reach for them. */
  return (
    <section className={styles.panel} aria-labelledby={`${ids}-title`} data-motion="off">
      <h2 id={`${ids}-title`} className={styles.title}>{c.title}</h2>
      <p className={styles.body}>{c.body}</p>

      {!open ? (
        <button type="button" className={styles.open} onClick={() => setOpen(true)}>
          {c.open}
        </button>
      ) : (
        <form className={styles.form} onSubmit={send} noValidate>
          <p className={styles.confirm}>{c.confirm}</p>
          <label className={styles.field}>
            <span>{c.emailLabel}</span>
            <input
              type="email"
              autoComplete="off"
              spellCheck="false"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={typed !== '' && !matches ? 'true' : undefined}
              aria-describedby={typed !== '' && !matches ? `${ids}-mismatch` : undefined}
              placeholder={email}
            />
          </label>
          {typed !== '' && !matches && <p id={`${ids}-mismatch`} className={styles.hint}>{c.mismatch}</p>}
          <label className={styles.field}>
            <span>{c.reason}</span>
            <textarea rows="3" maxLength="500" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {state.status === 'error' && <p className={styles.error} role="alert">{c.failed}</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.danger} disabled={!matches || state.status === 'sending'}>
              {state.status === 'sending' ? c.sending : c.submit}
            </button>
            <button type="button" className={styles.cancel} onClick={() => { setOpen(false); setTyped(''); setReason(''); setState({ status: 'idle' }); }}>
              {c.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
