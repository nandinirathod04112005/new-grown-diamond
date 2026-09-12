import { useEffect, useRef, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { unlockAdmin } from '@/lib/adminCode.js';
import { useAuth } from '@/hooks/useAuth.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import TextField from './TextField.jsx';
import { MIN_PASSWORD, confirmError, emailError, firstError, normalizeEmail, passwordError, requiredError, toMap } from './validation.js';
import styles from './Auth.module.css';
import { authErrorMessage, isEmailDeliveryFailure } from './authErrors.js';
import { authRedirectTo } from '@/lib/supabase/authRedirect.js';
import { createEnquiry } from '@/lib/supabase/queries/enquiries.js';
import { registerAdmin } from '@/lib/supabase/registerAdmin.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './RegisterPage.copy.js';

/**
 * Create an account.
 *
 * TWO KINDS, TWO ROUTES TO THE SERVER — deliberately not the same call.
 *
 *   Customer: supabase.auth.signUp() and nothing else. The name travels as
 *   `options.data.full_name`; the profiles row is written by the database's
 *   sign-up trigger (supabase/migrations/0003 if the project has none) with
 *   role = 'customer', and nothing the browser sends can change that. With
 *   email confirmation on, no session comes back and the person is told to
 *   check their email; with it off, one does and they are carried into the
 *   account.
 *
 *   Administrator: the `register-admin` Edge Function (see
 *   lib/supabase/registerAdmin.js). The staff code is checked THERE, against
 *   a secret the browser never sees; the account is created already confirmed
 *   and its profiles row is written with role = 'admin'. The same email and
 *   password then sign in, and the desk opens. An earlier version sent staff
 *   sign-ups through signUp() and only logged a request — every staff account
 *   came out a customer, and stayed one.
 *
 * Telling someone they are signed in when a confirmation email is sitting
 * unopened is how an account page becomes a support ticket, so each outcome
 * says which one happened.
 */
export default function RegisterPage() {
  const { status: authStatus, profile, signOut } = useAuth();
  const { t, locale, href } = useLocale();
  const c = useCopy(COPY);
  const [kind, setKind] = useState('customer'); // 'customer' | 'admin'
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  /* Asked only of staff: the function that creates a staff account requires
     both, and a desk account without a phone number is one nobody can call. */
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // 'session' | 'confirm' | 'admin'
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
  const phoneRef = useRef(null);
  const countryRef = useRef(null);
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
   * The account is live, so carry the person into it — a customer to the
   * account page, an administrator straight to the desk.
   *
   * Only when a session exists — with confirmation on there is none and
   * nothing to enter yet. A short delay lets the confirmation be read and
   * announced first; a hard navigation, like sign-in uses, so the auth state
   * is re-read cleanly by the page that owns it rather than inherited from a
   * form that has just unmounted.
   */
  useEffect(() => {
    if (done !== 'session' && done !== 'admin') return undefined;
    const timer = setTimeout(() => window.location.assign(done === 'admin' ? '/admin' : href('/account')), 1400);
    return () => clearTimeout(timer);
  }, [done, href]);

  /*
   * Staff. The function checks the code and creates the account confirmed,
   * so the same details sign in immediately — no email, no link, nothing to
   * wait for.
   */
  async function createStaffAccount() {
    try {
      await registerAdmin({
        email: normalizeEmail(email),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        country: country.trim(),
        code: code.trim(),
      });
    } catch (err) {
      console.error('[NGD register] staff registration failed:', err);
      if (err?.code === 'invalid_admin_code') {
        /* On the field it belongs to, kept and selected rather than wiped —
           a masked value the person cannot see should not have to be retyped
           blind after one slip. */
        setFieldErrors({ code: t('validation.codeWrong') });
        requestAnimationFrame(() => { codeRef.current?.focus(); codeRef.current?.select?.(); });
        return;
      }
      /* The function's reasons are worded by code in the visitor's language
         (RegisterPage.copy.js); a code with no wording shows its own text. */
      setError(err?.code ? (c.staffErrors[err.code] ?? err.message) : authErrorMessage(err, c.notCreatedRetry, locale));
      return;
    }

    const { data, error: err } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (err || !data?.session) {
      console.error('[NGD register] sign-in after staff registration failed:', err);
      setError(c.staffSignInFailed);
      return;
    }
    // They have just proved they hold the code, so the desk gate does not ask
    // for it again this session. The gate still reads the role from the
    // database; this saves a keystroke and grants nothing.
    unlockAdmin();
    setDone('admin');
  }

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!isConfigured || busy) return;

    /*
     * Every field, checked in the order they appear on screen.
     *
     * The form carries noValidate, so `required` on the inputs enforces
     * nothing; this is the enforcement. Order matters twice: the message list
     * is rendered field by field, and the first failing field is the one that
     * receives focus.
     *
     * The staff code is checked for PRESENCE only. Whether it is right is the
     * server's call — comparing it here against a value in the bundle would
     * say nothing the server does not say better, and would block a correct
     * code whenever the two were set differently.
     */
    /* Whether a field is empty is validation.js's rule; the sentence that
       says so is this page's, one per field (RegisterPage.copy.js, `need`). */
    const need = (value, field) => (requiredError(value, field) ? c.need[field] : null);
    /* Two characters is the staff function's rule; a customer's name is
       whatever they gave, as it always was. */
    const name = need(fullName, 'fullName')
      ?? (kind === 'admin' && fullName.trim().length < 2 ? c.need.fullName : null);
    const checks = kind === 'admin'
      ? [
          ['code', code.trim() ? null : t('validation.codeRequired')],
          ['fullName', name],
          ['email', emailError(email, t)],
          ['phone', need(phone, 'phone')],
          ['country', need(country, 'country')],
          ['password', passwordError(password, { min: MIN_PASSWORD }, t)],
          ['confirm', confirmError(password, confirm, t)],
        ]
      : [
          ['fullName', name],
          ['email', emailError(email, t)],
          ['password', passwordError(password, { min: MIN_PASSWORD }, t)],
          ['confirm', confirmError(password, confirm, t)],
        ];
    const bad = firstError(checks);
    setFieldErrors(toMap(checks));
    if (bad) {
      /* The banner is cleared: a stale server error above a fresh set of field
         errors reads as two separate failures when there is one. */
      setError('');
      /* Built inside the handler, where touching a ref is legitimate. */
      ({
        code: codeRef, fullName: fullNameRef, email: emailRef, phone: phoneRef,
        country: countryRef, password: passwordRef, confirm: confirmRef,
      })[bad]?.current?.focus();
      return;
    }

    setBusy(true);
    setError('');
    setBlocked(null);
    try {
      if (kind === 'admin') {
        await createStaffAccount();
        return;
      }

      const { data, error: err } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        /*
         * Metadata carries ONLY what the existing profile flow reads: the
         * name. Nothing role-shaped goes here, not even a request.
         *
         * Sign-up metadata is written by the browser, so any value in it is
         * effectively chosen by whoever fills in the form, and a database
         * trigger that copied a role-like field out of it would turn a value
         * anyone can type into self-service admin. Staff accounts are created
         * by the server-side path above, which never touches signUp().
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
          });
        }
        // Supabase's own message is surfaced because it covers real, actionable
        // cases — a weak password, a malformed address, rate limiting. It is not
        // extended with any check of our own for whether the email exists.
        setError(authErrorMessage(err, err.message || c.notCreated, locale));
        return;
      }

      if (!data.session && Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
        setError(c.maybeRegistered);
        return;
      }
      if (!data.user) {
        setError(c.noAccountReturned);
        return;
      }

      // A session means confirmation is off and they are already in. No session
      // means an email is on its way and nothing has happened yet.
      setDone(data.session ? 'session' : 'confirm');
    } catch (err) {
      setError(authErrorMessage(err, c.notCreatedRetry, locale));
    } finally {
      setBusy(false);
    }
  }

  if (done === 'admin') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title={c.created.title} intro={c.created.adminIntro}>
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">{c.created.adminStatus}</div>
        <div className={styles.actions}>
          <a className={styles.submit} href="/admin">{c.created.openDesk}</a>
          <a className={styles.ghost} href="/account">{t('auth.goToAccount')}</a>
        </div>
      </AuthShell>
    );
  }

  if (done === 'session') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title={c.created.title} intro={c.created.sessionIntro}>
        {/*
          A session came back, so confirmation is off and the account is live.
          The redirect goes to /account — the same route sign-in uses — where
          the existing profile flow finishes. It is delayed a beat so the
          confirmation is read and announced before the page changes underneath
          it; the links below are the fallback if the redirect is blocked.
        */}
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">{c.created.sessionStatus}</div>
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">{t('auth.goToAccount')}</a>
          <a className={styles.ghost} href="/diamonds">{t('auth.browseInventory')}</a>
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
        title={handed ? c.blocked.handedTitle : c.blocked.title}
        intro={handed
          ? c.blocked.handedIntro
          : error}
        aside={<>{t('auth.alreadyRegistered')} <a href="/login">{t('auth.signInTitle')}</a>{c.stop}</>}
      >
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">
        {handed ? (
          <>
            <p className={styles.note} data-tone="good">
              <strong>{interpolate(c.blocked.reference, { ref: handed })}</strong>
              {c.blocked.handedBody}
            </p>
            <div className={styles.actions}>
              <a className={styles.submit} href="/diamonds">{t('auth.browseInventory')}</a>
              <a className={styles.ghost} href="/contact">{c.blocked.contactDesk}</a>
            </div>
          </>
        ) : (
          <>
            {/* The intro above already carries `error`; this states the one
                fact it does not — that nothing was created. */}
            <p className={styles.note} data-tone="error" role="alert">
              <strong>{c.blocked.none}</strong>
              {c.blocked.noneBody}
            </p>
            <p className={styles.hint}>
              {c.blocked.offer}
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
                      message: 'Website sign-up could not complete because the email service was over its limit. Please create this account and confirm the address.',
                    }, null);
                    setHanded(ref);
                  } catch (e) {
                    console.error('[NGD register handoff]', e);
                    setHandError(c.blocked.handFailed);
                  } finally {
                    setHanding(false);
                  }
                }}
              >
                {handing ? <><span className={styles.spinner} aria-hidden="true" />{c.sending}</> : c.blocked.send}
              </button>
              <button type="button" className={styles.ghost} onClick={() => setBlocked(null)}>
                {t('common.retry')}
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
        title={t('auth.checkEmail')}
        intro={t('auth.checkEmailBody')}
      >
        <div ref={outcome} tabIndex={-1} className={styles.outcome} role="status">
          <p className={styles.note} data-tone="good">
            <strong>{interpolate(c.confirm.sent, { email: normalizeEmail(email) })}</strong>
            {c.confirm.body}
          </p>
        </div>
        <div className={styles.actions}>
          {/* The ONLY place a confirmation email is re-sent, and only on this
              click — never on load, never on a timer, never twice while one
              is in flight. */}
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
                setResendError(authErrorMessage(err, err.message || c.confirm.resendFailed, locale));
                setResent('failed');
              }
            }}
          >
            {resent === 'sending' ? c.sending : c.confirm.resend}
          </button>
          <a className={styles.ghost} href="/login">{c.confirm.back}</a>
        </div>
        {resent === 'sent' && <p className={styles.hint} role="status">{c.confirm.resent}</p>}
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
        title={c.already.title}
        intro={profile?.email || profile?.full_name || c.already.intro}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">{t('auth.goToAccount')}</a>
          <button type="button" className={styles.ghost} onClick={signOut}>{c.already.signOut}</button>
        </div>
      </AuthShell>
    );
  }

  /* Entrance order for the fields; staff have three more, so the positions
     of everything after the account type shift by kind. */
  const admin = kind === 'admin';

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title={t('auth.registerTitle')}
      intro={t('auth.registerIntro')}
      aside={<>{t('auth.alreadyRegistered')} <a href="/login">{t('auth.signInTitle')}</a>{c.stop}</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            <strong>{c.unavailable.title}</strong>
            {c.unavailable.body}
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
          <legend className={styles.label}>{t('auth.accountType')}</legend>
          <div className={styles.kindRow}>
            {[
              ['customer', t('auth.customer'), t('auth.customerBlurb')],
              ['admin', t('auth.administrator'), t('auth.administratorBlurb')],
            ].map(([value, title, blurb]) => (
              <label key={value} className={styles.kind} data-on={kind === value ? '' : undefined}>
                <input
                  type="radio"
                  name="accountKind"
                  value={value}
                  checked={kind === value}
                  disabled={busy}
                  onChange={() => { setKind(value); setError(''); setFieldErrors({}); }}
                />
                <span className={styles.kindTitle}>{title}</span>
                <span className={styles.kindBlurb}>{blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {admin && (
          /* The code is usually read off a message on another device and typed
             in one character at a time, which is exactly when a reveal earns
             its place — so it gets one, worded for what it is. */
          <PasswordField
            label={t('auth.staffCode')}
            revealLabel="code"
            value={code}
            index={1}
            required
            inputRef={codeRef}
            error={fieldErrors.code}
            /* Not `one-time-code`: that invites the browser to offer an SMS
               passcode, which this is not. `off` keeps managers out of it. */
            autoComplete="off"
            hint={t('auth.staffCodeHint')}
            onChange={(e) => { setCode(e.target.value); setError(''); clear('code'); }}
          />
        )}

        <TextField
          label={t('auth.fullName')}
          value={fullName}
          index={admin ? 2 : 1}
          required
          maxLength={160}
          autoComplete="name"
          placeholder={t('auth.yourName')}
          inputRef={fullNameRef}
          error={fieldErrors.fullName}
          onChange={(e) => { setFullName(e.target.value); clear('fullName'); }}
        />

        <TextField
          label={t('auth.email')}
          type="email"
          value={email}
          index={admin ? 3 : 2}
          required
          autoComplete="email"
          placeholder="you@company.com"
          inputRef={emailRef}
          error={fieldErrors.email}
          onChange={(e) => { setEmail(e.target.value); clear('email'); }}
        />

        {admin && (
          <>
            <TextField
              label={c.phone}
              type="tel"
              value={phone}
              index={4}
              required
              maxLength={40}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 …"
              inputRef={phoneRef}
              error={fieldErrors.phone}
              onChange={(e) => { setPhone(e.target.value); clear('phone'); }}
            />
            <TextField
              label={c.country}
              value={country}
              index={5}
              required
              maxLength={80}
              autoComplete="country-name"
              placeholder={c.countryPlaceholder}
              inputRef={countryRef}
              error={fieldErrors.country}
              onChange={(e) => { setCountry(e.target.value); clear('country'); }}
            />
          </>
        )}

        <PasswordField
          label={t('auth.password')}
          value={password}
          index={admin ? 6 : 3}
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          hint={t('auth.minChars', { n: MIN_PASSWORD })}
          inputRef={passwordRef}
          error={fieldErrors.password}
          onChange={(e) => { setPassword(e.target.value); clear('password'); }}
        />

        <PasswordField
          label={t('auth.confirmPassword')}
          value={confirm}
          index={admin ? 7 : 4}
          required
          autoComplete="new-password"
          inputRef={confirmRef}
          error={fieldErrors.confirm}
          onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }}
        />

        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />{t('auth.creating')}</> : c.submit}
        </button>

        <p className="u-visually-hidden" aria-live="polite">
          {busy ? c.live : error || ''}
        </p>
      </form>
    </AuthShell>
  );
}
