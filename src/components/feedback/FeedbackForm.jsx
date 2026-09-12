import { useId, useState } from 'react';
import { CircleCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { EMAIL_PATTERN, LIMITS, submitFeedback, TOPICS } from '@/lib/supabase/queries/feedback.js';
import COPY from './Feedback.copy.js';
import { noteSent, sentToday, SPAM_TRAP } from './sendGuard.js';
import { StarsInput } from './Stars.jsx';
import styles from './Feedback.module.css';

/**
 * Send feedback — as a guest or signed in.
 *
 * It goes to the desk as an enquiry (queries/feedback.js), under the same
 * policies the contact form uses, and nothing is published until the team
 * approves it. Signed-in clients have their name and email filled in and can
 * follow their feedback's status on the feedback page; guests type both.
 *
 * `blogSlug` ties the feedback to one journal article.
 */
export default function FeedbackForm({ blogSlug = null, articleTitle = null, onSubmitted }) {
  const auth = useAuth();
  const id = useId();
  const shared = useCopy(COPY);
  const c = shared.feedback;
  const [rating, setRating] = useState(0);
  const [topic, setTopic] = useState(blogSlug ? 'journal' : 'general');
  const [message, setMessage] = useState('');
  /* null until typed in, so the account's details can stand in without an
     effect copying them across when the profile arrives. */
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);
  const [city, setCity] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState('idle');
  const [failure, setFailure] = useState('');

  const signedIn = auth.status === 'ready' && Boolean(auth.user);
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

  const shownName = name ?? auth.profile?.full_name ?? '';
  const shownEmail = email ?? auth.user?.email ?? '';

  if (stage === 'sent') {
    return (
      <div className={styles.formShell} data-tone="done" role="status">
        <CircleCheck size={24} strokeWidth={1.4} aria-hidden="true" />
        <h3>{c.sent.title}</h3>
        <p>
          {signedIn ? c.sent.noteSignedIn : c.sent.note}
        </p>
        <button
          type="button"
          className={styles.textLink}
          onClick={() => {
            setRating(0); setMessage(''); setConsent(false); setErrors({}); setStage('idle');
          }}
        >
          {c.sent.again}
        </button>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    const m = message.trim();
    if (!rating) e.rating = c.invalid.rating;
    if (m.length < LIMITS.messageMin) e.message = interpolate(c.invalid.messageShort, { n: LIMITS.messageMin });
    if (m.length > LIMITS.messageMax) e.message = interpolate(c.invalid.messageLong, { n: LIMITS.messageMax });
    if (shownName.trim().length < 2) e.name = c.invalid.name;
    if (shownName.trim().length > LIMITS.name) e.name = interpolate(c.invalid.nameLong, { n: LIMITS.name });
    if (!EMAIL_PATTERN.test(shownEmail.trim())) e.email = c.invalid.email;
    if (city.trim().length > LIMITS.city) e.city = interpolate(c.invalid.cityLong, { n: LIMITS.city });
    if (!consent) e.consent = c.invalid.consent;
    return e;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    setFailure('');
    if (Object.keys(e).length) {
      /* After the errors have rendered, take focus to the first field that
         has one — its own control, or the first control inside it. */
      const form = event.currentTarget;
      requestAnimationFrame(() => {
        const bad = form.querySelector('[aria-invalid="true"]');
        const target = bad?.matches('input, textarea, select') ? bad : bad?.querySelector('input, textarea, select');
        target?.focus();
      });
      return;
    }
    /* A filled trap is a bot: look finished, send nothing. */
    if (trap) { setStage('sent'); return; }
    if (sentToday('feedback') >= 5) {
      setFailure(c.limit);
      return;
    }
    setStage('sending');
    try {
      const reference = await submitFeedback({ rating, message, name: shownName, email: shownEmail, city, topic, blogSlug });
      noteSent('feedback');
      setStage('sent');
      onSubmitted?.(reference);
    } catch (err) {
      /* The lib names the refusal; the sentence is shown in the visitor's language. */
      setFailure(shared.errors[err.reason] ?? err.message);
      setStage('idle');
    }
  };

  const left = LIMITS.messageMax - message.length;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {articleTitle ? <p className={styles.formAbout}>{interpolate(c.about, { title: articleTitle })}</p> : null}

      <StarsInput value={rating} onChange={fix('rating', setRating)} name={`${id}-rating`} invalid={Boolean(errors.rating)} />
      {errors.rating ? <p className={styles.fieldError}>{errors.rating}</p> : null}

      {!blogSlug && (
        <label className={styles.field}>
          <span>{c.topic}</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {/* The value is the English key the desk's subject line carries;
                only the label is in the visitor's language. */}
            {TOPICS.filter(([k]) => k !== 'journal').map(([k, labelText]) => (
              <option key={k} value={k}>{shared.topics[k] ?? labelText}</option>
            ))}
          </select>
        </label>
      )}

      <label className={styles.field}>
        <span>{c.message}</span>
        <textarea
          rows={5}
          value={message}
          maxLength={LIMITS.messageMax + 50}
          onChange={(e) => fix('message', setMessage)(e.target.value)}
          aria-invalid={errors.message ? 'true' : undefined}
          aria-describedby={`${id}-count${errors.message ? ` ${id}-msg` : ''}`}
          placeholder={c.placeholder}
        />
        <span id={`${id}-count`} className={styles.counter} data-over={left < 0 ? '' : undefined}>
          {left >= 0 ? interpolate(c.left, { n: left }) : interpolate(c.over, { n: -left })}
        </span>
        {errors.message ? <span id={`${id}-msg`} className={styles.fieldError}>{errors.message}</span> : null}
      </label>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span>{c.name}</span>
          <input
            value={shownName}
            onChange={(e) => fix('name', setName)(e.target.value)}
            maxLength={LIMITS.name + 10}
            autoComplete="name"
            aria-invalid={errors.name ? 'true' : undefined}
          />
          {errors.name ? <span className={styles.fieldError}>{errors.name}</span> : null}
        </label>
        <label className={styles.field}>
          <span>{c.city} <em>{shared.optional}</em></span>
          <input
            value={city}
            onChange={(e) => fix('city', setCity)(e.target.value)}
            maxLength={LIMITS.city + 10}
            autoComplete="address-level2"
            aria-invalid={errors.city ? 'true' : undefined}
          />
          {errors.city ? <span className={styles.fieldError}>{errors.city}</span> : null}
        </label>
      </div>

      <label className={styles.field}>
        <span>{shared.email} <em>{c.emailNote}</em></span>
        <input
          type="email"
          value={shownEmail}
          onChange={(e) => fix('email', setEmail)(e.target.value)}
          autoComplete="email"
          inputMode="email"
          aria-invalid={errors.email ? 'true' : undefined}
        />
        {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
      </label>

      {/* A field people never see and bots fill in. */}
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
        <span className={styles.quiet}>
          {signedIn ? c.account : <>{c.guestLead}<a href="/login">{c.guestLink}</a>{c.guestTail}</>}
        </span>
      </div>
    </form>
  );
}
