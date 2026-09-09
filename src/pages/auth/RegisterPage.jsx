import { useEffect, useRef, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { isAdminCode, unlockAdmin } from '@/lib/adminCode.js';
import { useAuth } from '@/hooks/useAuth.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import TextField from './TextField.jsx';
import { MIN_PASSWORD, confirmError, emailError, firstError, normalizeEmail, passwordError, requiredError, toMap } from './validation.js';
import styles from './Auth.module.css';
import { authErrorMessage, isEmailDeliveryFailure } from './authErrors.js';
import { authRedirectTo } from '@/lib/supabase/authRedirect.js';
import { createEnquiry } from '@/lib/supabase/queries/enquiries.js';

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
  const { status: authStatus, profile, signOut } = useAuth();
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
  /*
   * The dead end this exists to remove.
   *
   * When the mail service is over its limit, Supabase refuses the sign-up
   * outright — no account is created and no email is sent, so the visitor gets
   * an error and has nowhere to go. They came here to open an account; being
   * told to come back later is not an outcome.
   *
   * So the request is captured through the enquiries table the contact form
   * already writes to, which needs no email and no dashboard change, and the
   * desk activates the account by hand. `blocked` holds the details while that
   * is offered; `handed` is the reference once it has been sent.
   */
  const [blocked, setBlocked] = useState(null);
  const [handing, setHanding] = useState(false);
  const [handed, setHanded] = useState(null);
  const [handError, setHandError] = useState('');
  const [resent, setResent] = useState('');
  const [resendError, setResendError] = useState('');
  /* Declared individually rather than gathered into one object: reading
     `refs.email` during render is indistinguishable, to a linter, from reading
     `.current`, and a rule that fires on correct code stops being useful. */
  const codeRef = useRef(null);
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const clear = (k) => setFieldErrors((f) => ({ ...f, [k]: null }));

  /*
   * Where focus goes when the form is replaced by an outcome.
   *
   * Submitting swaps the entire tree. The button that had focus is destroyed,
   * and a browser answers that by moving focus to the document — so a keyboard
   * user's next Tab started at the site mark at the top of the page, and a
   * screen reader heard "Creating your account" and then nothing, because the
   * live region that would have carried the result was inside the form that
   * had just unmounted. The outcome panel now takes focus itself, so the
   * heading is read and the tab sequence resumes from there.
   */
  const outcome = useRef(null);
  useEffect(() => {
    if (done || blocked) outcome.current?.focus();
  }, [done, blocked]);

  /*
   * Confirmation off: the account is live, so carry the person into it.
   *
   * Only on the session path — with confirmation on there is no session and
   * nothing to enter yet. A short delay lets the confirmation be read and
   * announced first; a hard navigation, like sign-in uses, so the auth state
   * is re-read cleanly by the page that owns it rather than inherited from a
   * form that has just unmounted.
   */
  useEffect(() => {
    if (done !== 'session') return undefined;
    const timer = setTimeout(() => window.location.assign('/account'), 1400);
    return () => clearTimeout(timer);
  }, [done]);

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!isConfigured || busy) return;

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
    setBlocked(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        /*
         * Metadata carries ONLY what the existing profile flow reads: the
         * name. Nothing role-shaped goes here, not even a request.
         *
         * Sign-up metadata is written by the browser, so any value in it is
         * effectively chosen by whoever fills in the form, and a database
         * trigger that copied a role-like field out of it would turn the staff
         * code — readable in the bundle — into self-service admin. An earlier
         * version wrote `requested_role: 'admin'` here as a deliberately
         * non-granting marker; it is gone, because a field nothing should ever
         * trust is safer not existing than existing and being trusted by
         * accident. The staff request reaches a person through the enquiries
         * queue instead, below.
         */
        options: {
          /*
           * The callback route, not /account. Landing on the account page
           * works only when the link is still valid: an expired or
           * already-used link produces an error in the URL fragment and no
           * session, so the visitor arrived at a signed-out account page with
           * nothing explaining why. The callback reads that outcome and says
           * which of the two happened.
           */
          emailRedirectTo: authRedirectTo(),
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (err) {
        console.error('[NGD register]', err);
        /*
         * Distinguish "the mail service is full" from every other failure.
         * A wrong password format is the visitor's to fix; this one is ours,
         * and it is the only case where handing the request to the desk is the
         * right answer rather than a confusing detour.
         */
        /*
         * Any failure whose cause is the confirmation email — the hourly cap
         * (429) or the mail service being broken (500 "Error sending
         * confirmation email"). Matching only the first missed the second
         * entirely, and the second is the one that does not fix itself by
         * waiting.
         *
         * Either way Supabase has rolled the sign-up back, so there is no
         * account and the visitor needs a route that does not depend on mail.
         */
        if (isEmailDeliveryFailure(err)) {
          setBlocked({
            fullName: fullName.trim(),
            email: normalizeEmail(email),
            wantsAdmin: kind === 'admin',
          });
        }
        // Supabase's own message is surfaced because it covers real, actionable
        // cases — a weak password, a malformed address, rate limiting. It is not
        // extended with any check of our own for whether the email exists.
        setError(authErrorMessage(err, err.message || 'That account could not be created.'));
        return;
      }

      if (!data.session && Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
        setError('This email may already be registered. Try signing in or use Forgot password. No new confirmation email was verified.');
        return;
      }
      if (!data.user) {
        setError('The account service returned no account. Please try again.');
        return;
      }

      // They have just proved they hold the code, so the desk gate does not ask
      // for it again this session. It still checks the profile role, so this
      // saves a keystroke and grants nothing.
      if (kind === 'admin') {
        unlockAdmin();
        /*
         * A request has to reach a person, and user_metadata reaches none:
         * nothing in the product reads requested_role, and the client cannot
         * even query it. So the request is ALSO written to the enquiries
         * queue, which the desk already works from. Best-effort — a failure
         * here must not undo an account that was just created.
         */
        createEnquiry({
          fullName: fullName.trim(),
          companyName: '',
          email: normalizeEmail(email),
          mobile: '',
          country: '',
          subject: 'Staff access request',
          message: 'This person signed up with the staff access code and asked for administrator access. Verify who they are, then set profiles.role to admin for their account.',
        }, null).catch((e) => console.error('[NGD register] staff request note failed:', e));
      }

      // A session means confirmation is off and they are already in. No session
      // means an email is on its way and nothing has happened yet.
      setDone(data.session ? 'session' : 'confirm');
    } catch (err) {
      setError(authErrorMessage(err, 'That account could not be created. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (done === 'session') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title="Account created successfully" intro="You are signed in. Taking you to your account…">
        {/*
          A session came back, so confirmation is off and the account is live.
          The redirect goes to /account — the same route sign-in uses — where
          the existing profile flow finishes and, for a real administrator, the
          desk link appears. It is delayed a beat so the confirmation is read
          and announced before the page changes underneath it; the links below
          are the fallback if the redirect is blocked.
        */}
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">Account created. You are signed in.</div>
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

  /*
   * Shown instead of a bare error when the mail service is the thing that
   * failed. It states plainly that no account was created — the one fact a
   * visitor needs, because otherwise they will try again with the same address
   * and hit "already registered" later.
   */
  if (blocked && !done) {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title={handed ? 'The desk has your request' : 'We could not finish just now'}
        intro={handed
          ? 'Someone will set your account up and email you directly.'
          : error}
        aside={<>Already registered? <a href="/login">Sign in</a>.</>}
      >
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">
        {handed ? (
          <>
            <p className={styles.note} data-tone="good">
              <strong>Reference {handed}.</strong>
              We have your name and email. The desk will create your account and
              contact you — usually the same working day.
            </p>
            <div className={styles.actions}>
              <a className={styles.submit} href="/diamonds">Browse the inventory</a>
              <a className={styles.ghost} href="/contact">Contact the desk</a>
            </div>
          </>
        ) : (
          <>
            <p className={styles.note} data-tone="error" role="alert">
              {error}{' '}
              <strong>The confirmation email could not be sent.</strong>
              We could not verify whether an account already exists for this address.
            </p>
            <p className={styles.hint}>
              We can pass your details to the desk instead — they will set the
              account up by hand and email you. Only your name and email are
              sent; your password is not, and never leaves this page.
            </p>
            {handError && <p className={styles.note} data-tone="error" role="alert">{handError}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.submit}
                disabled={handing}
                onClick={async () => {
                  setHanding(true);
                  setHandError('');
                  try {
                    /*
                     * The existing enquiries table, which the contact form
                     * already writes to as an anonymous visitor. No new table,
                     * no new policy, and deliberately NO password — an account
                     * request is not a place to store one.
                     */
                    const ref = await createEnquiry({
                      fullName: blocked.fullName,
                      companyName: '',
                      email: blocked.email,
                      mobile: '',
                      country: '',
                      subject: 'Account setup',
                      message: blocked.wantsAdmin
                        ? 'Website sign-up could not complete because the email service was over its limit. This person also requested STAFF access — verify before granting it.'
                        : 'Website sign-up could not complete because the email service was over its limit. Please create this account and confirm the address.',
                    }, null);
                    setHanded(ref);
                  } catch (e) {
                    console.error('[NGD register handoff]', e);
                    setHandError('That could not be sent either. Please email the desk directly.');
                  } finally {
                    setHanding(false);
                  }
                }}
              >
                {handing ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : 'Send my details to the desk'}
              </button>
              <button type="button" className={styles.ghost} onClick={() => setBlocked(null)}>
                Try again
              </button>
            </div>
          </>
        )}
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
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">
          <p className={styles.note} data-tone="good">
            <strong>Confirmation email sent to {normalizeEmail(email)}.</strong>
            Open it to finish creating your account. You are not signed in until
            you do. Check your spam folder if it does not appear.
          </p>
          {/*
            This is the branch this deployment actually takes — email
            confirmation is on, so a session never comes back — and it said
            nothing about the staff role. The person had typed a code, been
            told to check their email, and would later be refused by the desk
            with no explanation anywhere between. The same fact that was only
            ever shown on the unreachable branch is stated here, worded for
            the pending case.
          */}
          {kind === 'admin' && (
            <p className={styles.note}>
              <strong>Staff access has been requested, not granted.</strong>
              Confirm your email first. The account then works as a customer
              account until an existing administrator enables the staff role —
              the desk has been notified.
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            disabled={resent === 'sending'}
            onClick={async () => {
              if (resent === 'sending') return;
              setResent('sending');
              setResendError('');
              try {
              const { error: err } = await supabase.auth.resend({
                type: 'signup',
                email: normalizeEmail(email),
                options: { emailRedirectTo: authRedirectTo() },
              });
              if (err) throw err;
              setResent('sent');
              } catch (err) {
                setResendError(authErrorMessage(err, err.message || 'The confirmation email could not be sent.'));
                setResent('failed');
              }
            }}
          >
            {resent === 'sending' ? 'Sending…' : 'Resend confirmation email'}
          </button>
          <a className={styles.ghost} href="/login">Back to sign in</a>
        </div>
        {resent === 'sent' && <p className={styles.hint} role="status">Confirmation email sent. Check your inbox and spam folder.</p>}
        {resent === 'failed' && <p className={styles.note} data-tone="error" role="alert">{resendError}</p>}
      </AuthShell>
    );
  }

  /*
   * Someone already signed in is not creating an account; they are creating a
   * SECOND one underneath the first, which then shares a browser session with
   * it in ways nothing in this app was written to handle. Say so, and offer
   * the two things they might actually have meant.
   */
  if (authStatus === 'ready') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="You are already signed in"
        intro={profile?.email || profile?.full_name || 'This browser has an active account.'}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Go to your account</a>
          <button type="button" className={styles.ghost} onClick={signOut}>Sign out to create another</button>
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
          index={kind === 'admin' ? 2 : 1}
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
          index={kind === 'admin' ? 3 : 2}
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
          index={kind === 'admin' ? 4 : 3}
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
          index={kind === 'admin' ? 5 : 4}
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
