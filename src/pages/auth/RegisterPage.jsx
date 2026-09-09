import { useRef, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { isAdminCode, unlockAdmin } from '@/lib/adminCode.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import TextField from './TextField.jsx';
import { confirmError, emailError, firstError, passwordError, requiredError, toMap } from './validation.js';
import styles from './Auth.module.css';

const MIN_PASSWORD = 8;

/**
 * Create an account.
 *
 * The name is passed as `options.data.full_name`, which Supabase stores on the
 * auth user's own metadata. That needs no table and no schema change — which
 * matters here, because this project is explicitly not allowed to alter the
 * database. If a trigger populates public.profiles from that metadata it will
 * pick the name up; if not, the profile page lets them set it directly.
 *
 * A project may or may not require email confirmation, and the two outcomes
 * look completely different to the person who just pressed the button. Both
 * are handled explicitly, and the message says which one happened. Telling
 * someone they are signed in when a confirmation email is sitting unopened is
 * how an account page becomes a support ticket.
 */
export default function RegisterPage() {
  const [kind, setKind] = useState('customer'); // 'customer' | 'admin'
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // 'session' | 'confirm'
  const [tried, setTried] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  /* Declared individually rather than gathered into one object: reading
     `refs.email` during render is indistinguishable, to a linter, from reading
     `.current`, and a rule that fires on correct code stops being useful. */
  const codeRef = useRef(null);
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const clear = (k) => setFieldErrors((f) => ({ ...f, [k]: null }));

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!isConfigured) return;

    /*
     * Every field, checked in the order they appear on screen.
     *
     * This replaces three ad-hoc checks that covered the password rules and
     * the staff code but not the name or the address — so a blank or
     * malformed email went to Supabase and came back as a raw API error, and
     * a blank name created an account with no name on it. The form carries
     * noValidate, so `required` on the inputs enforces nothing; this is the
     * enforcement.
     *
     * Order matters twice: the message list is rendered field by field, and
     * the first failing field is the one that receives focus.
     */
    const checks = [
      ...(kind === 'admin'
        ? [['code', code.trim() ? (isAdminCode(code) ? null : 'That staff code is not correct.') : 'Enter the staff access code.']]
        : []),
      ['fullName', requiredError(fullName, 'full name')],
      ['email', emailError(email)],
      ['password', passwordError(password, { min: MIN_PASSWORD })],
      ['confirm', confirmError(password, confirm)],
    ];
    const bad = firstError(checks);
    setFieldErrors(toMap(checks));
    if (bad) {
      /* The banner is cleared: a stale server error above a fresh set of field
         errors reads as two separate failures when there is one. */
      setError('');
      /* Built inside the handler, where touching a ref is legitimate. */
      ({
        code: codeRef, fullName: fullNameRef, email: emailRef,
        password: passwordRef, confirm: confirmRef,
      })[bad]?.current?.focus();
      return;
    }

    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      /*
       * `requested_role`, deliberately NOT `role`.
       *
       * Sign-up metadata is written by the browser, so anything a database
       * trigger copies straight out of it is effectively writable by whoever
       * is filling in this form. If this said `role: 'admin'` and any trigger
       * trusted it, the staff code below — which is readable in the bundle —
       * would become a way for anyone at all to make themselves an
       * administrator. So this records an ASKING, under a name nothing grants
       * on, and an existing admin still has to set profiles.role themselves.
       */
      options: {
        data: {
          full_name: fullName.trim(),
          ...(kind === 'admin' ? { requested_role: 'admin' } : null),
        },
      },
    });
    setBusy(false);

    if (err) {
      console.error('[NGD register]', err);
      // Supabase's own message is surfaced because it covers real, actionable
      // cases — a weak password, a malformed address, rate limiting. It is not
      // extended with any check of our own for whether the email exists.
      setError(err.message || 'That account could not be created.');
      return;
    }

    // They have just proved they hold the code, so the desk gate does not ask
    // for it again this session. It still checks the profile role, so this
    // saves a keystroke and grants nothing.
    if (kind === 'admin') unlockAdmin();

    // A session means confirmation is off and they are already in. No session
    // means an email is on its way and nothing has happened yet.
    setDone(data.session ? 'session' : 'confirm');
  }

  if (done === 'session') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title="Account created" intro="You are signed in.">
        {/*
          Said plainly, because the alternative is someone typing the staff
          code, being told "account created", and then finding the desk still
          refuses them — with no idea why. The code opened the form; it did
          not make them an administrator, and only the database can.
        */}
        {kind === 'admin' && (
          <p className={styles.note} data-tone="good">
            <strong>Staff access has been requested, not granted.</strong>
            The account is active as a customer now. An existing administrator
            has to enable the staff role before the inventory desk will open.
          </p>
        )}
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Go to your account</a>
          <a className={styles.ghost} href="/diamonds">Browse the inventory</a>
        </div>
      </AuthShell>
    );
  }

  if (done === 'confirm') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="Check your email"
        intro="Your account is not active yet."
      >
        <p className={styles.note} data-tone="good">
          <strong>We have sent a confirmation link to {email}.</strong>
          Open it to finish creating your account. You are not signed in until
          you do.
        </p>
        <div className={styles.actions}>
          <a className={styles.ghost} href="/login">Back to sign in</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title="Create an account"
      intro="For retailers, jewellers and trade partners. Track enquiries and request grading reports."
      aside={<>Already registered? <a href="/login">Sign in</a>.</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            <strong>Registration is unavailable.</strong>
            The site is not connected to its database on this deployment.
          </p>
        )}

        {error && <p className={styles.note} data-tone="error" role="alert">{error}</p>}

        {/*
          First, because it decides what the rest of the form asks for. Radios
          rather than a select: there are two options, both should be readable
          without opening anything, and a fieldset gives the pair a name that a
          screen reader announces once instead of twice.
        */}
        <fieldset className={styles.kinds} style={{ '--i': 0 }}>
          <legend className={styles.label}>Account type</legend>
          <div className={styles.kindRow}>
            {[
              ['customer', 'Customer', 'Browse stock, send enquiries, keep your reports.'],
              ['admin', 'Administrator', 'Staff only. Needs the access code.'],
            ].map(([value, title, blurb]) => (
              <label key={value} className={styles.kind} data-on={kind === value ? '' : undefined}>
                <input
                  type="radio"
                  name="accountKind"
                  value={value}
                  checked={kind === value}
                  onChange={() => { setKind(value); setError(''); }}
                />
                <span className={styles.kindTitle}>{title}</span>
                <span className={styles.kindBlurb}>{blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === 'admin' && (
          /* The code is usually read off a message on another device and typed
             in one character at a time, which is exactly when a reveal earns
             its place — so it gets one, worded for what it is. */
          <PasswordField
            label="Staff access code"
            revealLabel="code"
            value={code}
            index={1}
            required
            inputRef={codeRef}
            error={fieldErrors.code}
            /* Not `one-time-code`: that invites the browser to offer an SMS
               passcode, which this is not. `off` keeps managers out of it. */
            autoComplete="off"
            inputMode="numeric"
            placeholder="••••••"
            hint="Ask an existing administrator. Staff access is confirmed in the database afterwards — this code only opens the request."
            onChange={(e) => { setCode(e.target.value); setError(''); clear('code'); }}
          />
        )}

        <TextField
          label="Full name"
          value={fullName}
          index={0}
          required
          maxLength={160}
          autoComplete="name"
          placeholder="Your name"
          inputRef={fullNameRef}
          error={fieldErrors.fullName}
          onChange={(e) => { setFullName(e.target.value); clear('fullName'); }}
        />

        <TextField
          label="Email"
          type="email"
          value={email}
          index={1}
          required
          autoComplete="email"
          placeholder="you@company.com"
          inputRef={emailRef}
          error={fieldErrors.email}
          onChange={(e) => { setEmail(e.target.value); clear('email'); }}
        />

        <PasswordField
          label="Password"
          value={password}
          index={2}
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          inputRef={passwordRef}
          error={fieldErrors.password}
          onChange={(e) => { setPassword(e.target.value); clear('password'); }}
        />

        <PasswordField
          label="Confirm password"
          value={confirm}
          index={3}
          required
          autoComplete="new-password"
          inputRef={confirmRef}
          error={fieldErrors.confirm}
          onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }}
        />

        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Creating…</> : 'Create account'}
        </button>

        <p className="u-visually-hidden" aria-live="polite">
          {busy ? 'Creating your account' : error || ''}
        </p>
      </form>
    </AuthShell>
  );
}
