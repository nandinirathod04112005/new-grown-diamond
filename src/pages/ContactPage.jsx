import { useMemo, useState } from 'react';
import stoneInHand from '@/assets/company/custom-jewellery-optimized.jpg';
import PageHero from '@/components/layout/PageHero.jsx';
import { isConfigured } from '@/lib/supabase/client.js';
import { createEnquiry, productRequestFromSearch } from '@/lib/supabase/queries/enquiries.js';
import { OFFICES } from './siteContent.js';
import styles from './UtilityPages.module.css';

const SUBJECTS = [
  'Loose diamonds',
  'Custom jewellery',
  'Trade programme',
  'Certificate or inspection',
];

export default function ContactPage() {
  const request = useMemo(() => productRequestFromSearch(window.location.search), []);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState(null);

  const defaultSubject = request?.type === 'jewellery' ? 'Custom jewellery' : 'Loose diamonds';
  const defaultMessage = request ? `I would like more information about ${request.reference}. ` : '';

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setTried(true);
    setStatus(null);

    if (!form.checkValidity()) {
      setStatus({ tone: 'error', text: 'Check the highlighted fields before continuing.' });
      form.reportValidity();
      return;
    }

    const values = new FormData(form);
    if (values.get('website')) return;
    if (!isConfigured) {
      setStatus({
        tone: 'error',
        text: 'The enquiry service is unavailable on this deployment. Use the direct email link below.',
      });
      return;
    }

    setBusy(true);
    try {
      const publicId = await createEnquiry({
        fullName: String(values.get('name')).trim(),
        companyName: String(values.get('company')).trim(),
        email: String(values.get('email')).trim(),
        mobile: String(values.get('phone')).trim(),
        country: String(values.get('country')).trim(),
        subject: String(values.get('enquiryType')).trim(),
        message: String(values.get('brief')).trim(),
      }, request);

      form.reset();
      setTried(false);
      setStatus({ tone: 'good', text: `Thank you — enquiry ${publicId} has been received.` });
    } catch (error) {
      console.error('[NGD enquiry]', error);
      setStatus({
        tone: 'error',
        text: 'We could not send your enquiry. Check your connection and try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <PageHero
        eyebrow="Contact / Four locations"
        title="Tell us the stone you need."
        intro="Share a shape, carat range, colour, clarity and quantity. Our team will respond with available options and supporting certificates."
        motif="pulse"
        accent="#d09268"
        image={stoneInHand}
        imageAlt="A loose polished diamond held in tweezers above an open hand." 
        action={{ href: '#enquiry', label: 'Start an enquiry' }}
      />
      <div className={styles.offices}>
        {OFFICES.map((office, index) => (
          <article key={office.city} className={styles.office}>
            <p>{String(index + 1).padStart(2, '0')} / Office</p><h2>{office.city}</h2><address>{office.address}</address>
            <a href={`tel:${office.tel}`}>{office.phone}</a>
            {office.email && <a href={`mailto:${office.email}`}>{office.email}</a>}
          </article>
        ))}
      </div>

      <section id="enquiry" className={styles.enquiry} aria-labelledby="enquiry-title">
        <div className={styles.formIntro}>
          <p className="u-eyebrow">Structured enquiry</p>
          <h2 id="enquiry-title">Give the diamond desk a useful starting point.</h2>
          <p>
            Submitted enquiries are stored in the existing protected Supabase
            workflow and receive a reference you can use with the desk.
          </p>
          {request && (
            <p className={styles.productRef}>
              <span>Linked {request.type}</span>
              <strong>{request.reference}</strong>
            </p>
          )}
        </div>

        <form
          className={styles.form}
          onSubmit={submit}
          noValidate
          data-tried={tried ? '' : undefined}
        >
          <div className={styles.formGrid}>
            <label className={styles.fieldControl}>
              <span>Name *</span>
              <input name="name" autoComplete="name" minLength="2" maxLength="160" placeholder=" " required />
            </label>
            <label className={styles.fieldControl}>
              <span>Email *</span>
              <input name="email" type="email" autoComplete="email" maxLength="254" placeholder=" " required />
            </label>
            <label className={styles.fieldControl}>
              <span>Company</span>
              <input name="company" autoComplete="organization" maxLength="160" />
            </label>
            <label className={styles.fieldControl}>
              <span>Phone</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength="40"
                pattern="[+()\-\s\d]{7,40}"
              />
            </label>
            <label className={styles.fieldControl}>
              <span>Country</span>
              <input name="country" autoComplete="country-name" maxLength="80" />
            </label>
            <label className={styles.fieldControl}>
              <span>Enquiry type *</span>
              <select name="enquiryType" defaultValue={defaultSubject} required>
                {SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </label>
          </div>
          <label className={styles.fieldControl}>
            <span>Shape, carat, colour, clarity and quantity *</span>
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
          <label className={styles.trap} aria-hidden="true">
            Website
            <input name="website" tabIndex="-1" autoComplete="off" />
          </label>
          <div className={styles.formActions}>
            <button type="submit" disabled={busy}>
              {busy ? 'Sending…' : <>Send enquiry <span aria-hidden="true">→</span></>}
            </button>
            <p
              role={status?.tone === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              data-tone={status?.tone}
            >
              {status?.text ?? ''}
            </p>
          </div>
        </form>
      </section>

      <section className={styles.direct}>
        <p className="u-eyebrow">Direct enquiry</p><h2>Certificates, videos and inspection support are available.</h2>
        <a href="mailto:newgrowndiamonds@gmail.com?subject=Diamond enquiry">Email the desk <span>→</span></a>
      </section>
    </main>
  );
}
