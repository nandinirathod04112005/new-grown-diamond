import { useMemo, useRef, useState } from 'react';
import stoneInHand from '@/assets/company/custom-jewellery-optimized.jpg';
import PageHero from '@/components/layout/PageHero.jsx';
import { trackEvent } from '@/lib/analytics.js';
import { isConfigured } from '@/lib/supabase/client.js';
import { createEnquiry, productRequestFromSearch } from '@/lib/supabase/queries/enquiries.js';
import { enquiryFollowUpUrl } from '@/lib/whatsapp.js';
import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { useSiteSettings } from '@/hooks/useSiteSettings.js';
import COPY from './ContactPage.copy.js';
import styles from './UtilityPages.module.css';

export default function ContactPage() {
  const request = useMemo(() => productRequestFromSearch(window.location.search), []);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState(null);
  const { t } = useLocale();
  const c = useCopy(COPY);
  /* The desk line, the four offices and the desk email: Settings in the
     Control Centre, built-in values until something is saved there. */
  const { desk, offices } = useSiteSettings();

  const defaultSubject = request?.type === 'jewellery' ? 'Custom jewellery' : 'Loose diamonds';
  const defaultMessage = request ? interpolate(c.defaultMessage, { reference: request.reference }) : '';

  /* Anonymous funnel count (lib/analytics.js): the first real input on this
     page view, once; the honeypot field does not count. */
  const startedOn = useRef(null);
  function noteStart(event) {
    const here = window.location.pathname;
    if (event.target?.name === 'website' || startedOn.current === here) return;
    startedOn.current = here;
    trackEvent('enquiry_started', here);
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setTried(true);
    setStatus(null);

    if (!form.checkValidity()) {
      setStatus({ tone: 'error', text: c.status.check });
      form.reportValidity();
      return;
    }

    const values = new FormData(form);
    if (values.get('website')) return;
    if (!isConfigured) {
      setStatus({
        tone: 'error',
        text: c.status.unavailable,
      });
      return;
    }

    setBusy(true);
    try {
      /*
       * Read into a payload FIRST, and keep it.
       *
       * The hand-off below has to say the same thing the stored enquiry says,
       * and `form.reset()` two lines down empties the fields — so reading them
       * a second time to build the message would produce an empty one. Same
       * object, both destinations.
       */
      const payload = {
        fullName: String(values.get('name')).trim(),
        companyName: String(values.get('company')).trim(),
        email: String(values.get('email')).trim(),
        mobile: String(values.get('phone')).trim(),
        country: String(values.get('country')).trim(),
        subject: String(values.get('enquiryType')).trim(),
        message: String(values.get('brief')).trim(),
      };
      const publicId = await createEnquiry(payload, request);
      trackEvent('enquiry_sent', window.location.pathname);

      form.reset();
      setTried(false);
      setStatus({
        tone: 'good',
        text: interpolate(c.status.received, { id: publicId }),
        /*
         * Offered, never opened for them. Firing a window at WhatsApp off the
         * back of a form submit is both a popup blocker's problem and a rude
         * surprise for someone who chose the written route on purpose.
         */
        whatsapp: enquiryFollowUpUrl({ ...payload, reference: publicId, product: request }),
      });
    } catch (error) {
      console.error('[NGD enquiry]', error);
      setStatus({
        tone: 'error',
        text: c.status.failed,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        intro={c.hero.intro}
        motif="pulse"
        accent="#d09268"
        backdrop={stoneInHand}
        backdropFocus="74% 46%"
        action={{ href: '#enquiry', label: c.hero.action }}
      />
      {/* Ahead of the office directory: someone who wants to talk to a person
          should not have to work out which of four cities to try first. */}
      <p className={styles.enquiryLine}>
        <span>{t('enquiryLine.label')}</span>
        <a href={`tel:${desk.tel}`}>{desk.phone}</a>
      </p>

      <div className={styles.offices}>
        {/* Keyed by position: always the same four places, whatever they are
            called. An office's further numbers (New York's two, built in)
            follow its main line. */}
        {offices.map((office, index) => (
          <article key={`office-${index}`} className={styles.office}>
            <p>{String(index + 1).padStart(2, '0')} / {c.office}</p><h2>{office.city}</h2><address>{office.address}</address>
            <a href={`tel:${office.tel}`}>{office.phone}</a>
            {office.lines.map((line, j) => <a key={`line-${j}`} href={`tel:${line.tel}`}>{line.phone}</a>)}
            {office.email && <a href={`mailto:${office.email}`}>{office.email}</a>}
          </article>
        ))}
      </div>

      <section id="enquiry" className={styles.enquiry} aria-labelledby="enquiry-title">
        <div className={styles.formIntro}>
          <p className="u-eyebrow">{c.form.eyebrow}</p>
          <h2 id="enquiry-title">{c.form.title}</h2>
          <p>{c.form.note}</p>
          {request && (
            <p className={styles.productRef}>
              <span>{interpolate(c.form.linked, { type: c.form.types[request.type] ?? request.type })}</span>
              <strong>{request.reference}</strong>
            </p>
          )}
        </div>

        <form
          className={styles.form}
          onSubmit={submit}
          onInput={noteStart}
          noValidate
          data-tried={tried ? '' : undefined}
        >
          {/*
            Two groups, named. Eight controls in one undifferentiated grid gave
            no sense of how far along the form a visitor was; "who you are"
            and "what you need" is the order the desk reads them in. The
            fields, names and validation are exactly what they were.
          */}
          <fieldset className={styles.fieldGroup}>
            <legend>{c.form.who}</legend>
            <div className={styles.formGrid}>
              <label className={styles.fieldControl}>
                <span>{c.form.name}</span>
                <input name="name" autoComplete="name" minLength="2" maxLength="160" placeholder=" " required />
              </label>
              <label className={styles.fieldControl}>
                <span>{c.form.email}</span>
                <input name="email" type="email" autoComplete="email" maxLength="254" placeholder=" " required />
              </label>
              <label className={styles.fieldControl}>
                <span>{c.form.company}</span>
                <input name="company" autoComplete="organization" maxLength="160" />
              </label>
              {/*
                Every one of the five characters in the pattern below is
                escaped on purpose. Browsers now compile the pattern attribute
                in unicodeSets ('v') mode, where ( ) and - are syntax
                characters inside a class, and one unescaped character makes
                the whole pattern illegal. An illegal pattern is not a strict
                pattern: the browser discards it, logs a SyntaxError, and the
                field then accepts "abc def ghi" as a phone number — which is
                what it did. Checked with new RegExp(source, 'v') against real
                numbers in four formats before it was changed.
              */}
              <label className={styles.fieldControl}>
                <span>{c.form.phone}</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength="40"
                  pattern="[+\(\)\-\s\d]{7,40}"
                  title={c.form.phoneHint}
                />
              </label>
            </div>
          </fieldset>
          <fieldset className={styles.fieldGroup}>
            <legend>{c.form.what}</legend>
            <div className={styles.formGrid}>
              <label className={styles.fieldControl}>
                <span>{c.form.country}</span>
                <input name="country" autoComplete="country-name" maxLength="80" />
              </label>
              <label className={styles.fieldControl}>
                <span>{c.form.type}</span>
                <select name="enquiryType" defaultValue={defaultSubject} required>
                  {/* The value is what the desk reads, so it stays English;
                      the visitor sees their own language. */}
                  {c.subjects.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
                </select>
              </label>
            </div>
          <label className={styles.fieldControl}>
            <span>{c.form.brief}</span>
            <textarea
              name="brief"
              rows="6"
              minLength="20"
              maxLength="1000"
              defaultValue={defaultMessage}
              placeholder=" "
              required
            />
          </label>
          </fieldset>
          <label className={styles.trap} aria-hidden="true">
            Website
            <input name="website" tabIndex="-1" autoComplete="off" />
          </label>
          <div className={styles.formActions}>
            <button type="submit" disabled={busy}>
              {busy ? c.form.sending : <>{c.form.send} <span aria-hidden="true">→</span></>}
            </button>
            <p
              role={status?.tone === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              data-tone={status?.tone}
            >
              {status?.text ?? ''}
            </p>
            {status?.whatsapp && (
              <a
                className={styles.waFollow}
                href={status.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.form.whatsapp} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </form>
      </section>

      <section className={styles.direct}>
        <p className="u-eyebrow">{c.direct.eyebrow}</p><h2>{c.direct.title}</h2>
        <a href={`mailto:${desk.email}?subject=Diamond enquiry`}>{c.direct.email} <span>→</span></a>
      </section>
    </main>
  );
}
