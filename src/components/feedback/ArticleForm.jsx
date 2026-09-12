import { useState } from 'react';
import { CircleCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { EMAIL_PATTERN } from '@/lib/supabase/queries/feedback.js';
import { ARTICLE_LIMITS, submitArticle } from '@/lib/supabase/queries/submissions.js';
import COPY from './Feedback.copy.js';
import { noteSent, sentToday, SPAM_TRAP } from './sendGuard.js';
import styles from './Feedback.module.css';

const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Send an article for the journal.
 *
 * It reaches the desk as an enquiry. Nothing is published by sending it: the
 * team reads it, and if they want to run it they open it as a draft in the
 * journal editor, edit it, add a photograph and publish it with the writer's
 * name. The writer hears back at the email they give here.
 */
export default function ArticleForm() {
  const auth = useAuth();
  const shared = useCopy(COPY);
  const c = shared.article;
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState('idle');
  const [failure, setFailure] = useState('');

  const shownName = name ?? auth.profile?.full_name ?? '';
  const shownEmail = email ?? auth.user?.email ?? '';
  /* A field's error goes as soon as the field is changed, not on the next send. */
  const fix = (key, setter) => (value) => {
    setter(value);
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  if (stage === 'sent') {
    return (
      <div className={styles.formShell} data-tone="done" role="status">
        <CircleCheck size={24} strokeWidth={1.4} aria-hidden="true" />
        <h3>{c.sent.title}</h3>
        <p>
          {shownEmail ? interpolate(c.sent.noteTo, { email: shownEmail }) : c.sent.noteYou}
        </p>
        <button
          type="button"
          className={styles.textLink}
          onClick={() => { setTitle(''); setSummary(''); setBody(''); setConsent(false); setErrors({}); setStage('idle'); }}
        >
          {c.sent.again}
        </button>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (shownName.trim().length < 2) e.name = c.invalid.name;
    if (!EMAIL_PATTERN.test(shownEmail.trim())) e.email = c.invalid.email;
    if (title.trim().length < 5) e.title = c.invalid.title;
    if (title.trim().length > ARTICLE_LIMITS.title) e.title = interpolate(c.invalid.titleLong, { n: ARTICLE_LIMITS.title });
    if (summary.trim().length > ARTICLE_LIMITS.summary) e.summary = interpolate(c.invalid.summaryLong, { n: ARTICLE_LIMITS.summary });
    if (body.trim().length < ARTICLE_LIMITS.bodyMin) e.body = interpolate(c.invalid.bodyShort, { n: ARTICLE_LIMITS.bodyMin });
    if (body.length > ARTICLE_LIMITS.bodyMax) e.body = interpolate(c.invalid.bodyLong, { n: ARTICLE_LIMITS.bodyMax.toLocaleString() });
    if (!consent) e.consent = c.invalid.consent;
    return e;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    setFailure('');
    if (Object.keys(e).length) {
      const form = event.currentTarget;
      requestAnimationFrame(() => {
        const bad = form.querySelector('[aria-invalid="true"]');
        const target = bad?.matches('input, textarea') ? bad : bad?.querySelector('input, textarea');
        target?.focus();
      });
      return;
    }
    if (trap) { setStage('sent'); return; }
    if (sentToday('article') >= 3) {
      setFailure(c.limit);
      return;
    }
    setStage('sending');
    try {
      await submitArticle({ name: shownName, email: shownEmail, title, summary, body });
      noteSent('article');
      setStage('sent');
    } catch (err) {
      /* The lib names the refusal; the sentence is shown in the visitor's language. */
      setFailure(shared.errors[err.reason] ?? err.message);
      setStage('idle');
    }
  };

  const count = words(body);

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p className={styles.formAbout}>{c.about}</p>

      <label className={styles.field}>
        <span>{c.title}</span>
        <input value={title} onChange={(e) => fix('title', setTitle)(e.target.value)} maxLength={ARTICLE_LIMITS.title + 10} aria-invalid={errors.title ? 'true' : undefined} />
        {errors.title ? <span className={styles.fieldError}>{errors.title}</span> : null}
      </label>

      <label className={styles.field}>
        <span>{c.summary} <em>{c.summaryNote}</em></span>
        <textarea rows={2} value={summary} onChange={(e) => fix('summary', setSummary)(e.target.value)} maxLength={ARTICLE_LIMITS.summary + 20} aria-invalid={errors.summary ? 'true' : undefined} />
        {errors.summary ? <span className={styles.fieldError}>{errors.summary}</span> : null}
      </label>

      <label className={styles.field}>
        <span>{c.body}</span>
        <textarea
          rows={12}
          value={body}
          onChange={(e) => fix('body', setBody)(e.target.value)}
          maxLength={ARTICLE_LIMITS.bodyMax + 100}
          aria-invalid={errors.body ? 'true' : undefined}
          placeholder={c.placeholder}
        />
        <span className={styles.counter}>{interpolate(count === 1 ? c.wordOne : c.wordMany, { n: count })}</span>
        {errors.body ? <span className={styles.fieldError}>{errors.body}</span> : null}
      </label>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span>{c.name}</span>
          <input value={shownName} onChange={(e) => fix('name', setName)(e.target.value)} maxLength={ARTICLE_LIMITS.name + 10} autoComplete="name" aria-invalid={errors.name ? 'true' : undefined} />
          {errors.name ? <span className={styles.fieldError}>{errors.name}</span> : null}
        </label>
        <label className={styles.field}>
          <span>{shared.email} <em>{c.emailNote}</em></span>
          <input type="email" value={shownEmail} onChange={(e) => fix('email', setEmail)(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={errors.email ? 'true' : undefined} />
          {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
        </label>
      </div>

      <label className={styles.trap} aria-hidden="true">
        {SPAM_TRAP}
        <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </label>

      <label className={styles.consent} aria-invalid={errors.consent ? 'true' : undefined}>
        <input type="checkbox" checked={consent} onChange={(e) => fix('consent', setConsent)(e.target.checked)} />
        <span>
          {c.consent}
        </span>
      </label>
      {errors.consent ? <p className={styles.fieldError}>{errors.consent}</p> : null}

      {failure ? <p className={styles.failure} role="alert">{failure}</p> : null}

      <div className={styles.formActions}>
        <button className={styles.primary} type="submit" disabled={stage === 'sending'}>
          {stage === 'sending' ? shared.sending : c.send}
        </button>
        <span className={styles.quiet}>{c.quiet}</span>
      </div>
    </form>
  );
}
