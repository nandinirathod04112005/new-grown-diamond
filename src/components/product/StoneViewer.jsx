import { useCallback, useEffect, useRef, useState } from 'react';

import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { stoneEnquiryUrl } from '@/lib/whatsapp.js';
import styles from './StoneViewer.module.css';

const TABS = [
  { key: 'photo', label: 'Photograph' },
  { key: 'cert', label: 'Certificate' },
];

/**
 * Full-screen inspection: zoom, turn, and read the report.
 *
 * A dialog rather than a route because it is a closer look at the row already
 * on screen — sending someone to another page to zoom loses their place in a
 * long grid.
 *
 * Focus is trapped while open, Escape closes, the page behind is inert and
 * scroll-locked, and focus returns to whatever opened it. Those four together
 * are what make an overlay usable by keyboard rather than a trap.
 */
export default function StoneViewer({ stone, onClose }) {
  const [tab, setTab] = useState('photo');
  const [zoom, setZoom] = useState(false);
  const panel = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      // Return focus to the control that opened this, or the keyboard user is
      // dropped back at the top of the document.
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panel.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  // Pointer position drives transform-origin, so the point under the cursor is
  // the point that grows — a zoom anchored to the centre fights the user.
  function track(event) {
    if (!zoom) return;
    const r = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width) * 100;
    const y = ((event.clientY - r.top) / r.height) * 100;
    event.currentTarget.style.setProperty('--ox', `${x}%`);
    event.currentTarget.style.setProperty('--oy', `${y}%`);
  }

  const src = stone.imageUrl || fallback;
  const cert = stone.certificate_url || '';

  return (
    <div className={styles.scrim} onClick={onClose} role="presentation">
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${stone.carat?.toFixed?.(2) ?? ''} carat ${stone.shape} diamond, ${stone.stockNumber}`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.ref}>{stone.stockNumber}</p>
            <h2 className={styles.title}>
              {stone.carat?.toFixed?.(2) ?? '—'} ct <span>{stone.shape}</span>
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Views">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? styles.tabOn : styles.tab}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.stageWrap}>
          {tab === 'photo' && (
            <div
              className={styles.zoomStage}
              data-zoom={zoom ? '' : undefined}
              onMouseMove={track}
              onClick={() => setZoom((z) => !z)}
              role="button"
              tabIndex={0}
              aria-label={zoom ? 'Zoom out' : 'Zoom in'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setZoom((z) => !z);
                }
              }}
            >
              <img src={src} alt={`${stone.shape} diamond ${stone.stockNumber}`} />
              <span className={styles.hint}>{zoom ? 'Click to zoom out' : 'Click to zoom'}</span>
            </div>
          )}

          {tab === 'cert' && (
            <div className={styles.certStage}>
              {cert ? (
                <>
                  <iframe className={styles.certFrame} src={cert} title={`Grading report for ${stone.stockNumber}`} />
                  <a className={styles.certLink} href={cert} target="_blank" rel="noopener noreferrer">
                    Open the full report →
                  </a>
                </>
              ) : (
                <div className={styles.certEmpty}>
                  <p className={styles.muted}>
                    No report is attached to this stone yet.
                  </p>
                  <p className={styles.certMeta}>
                    {stone.lab && stone.lab !== '—' ? `Graded by ${stone.lab}` : 'Grading available on request'}
                  </p>
                  <a className={styles.certLink} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
                    Request the certificate →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <dl className={styles.specs}>
          <div><dt>Colour</dt><dd>{stone.colour}</dd></div>
          <div><dt>Clarity</dt><dd>{stone.clarity}</dd></div>
          <div><dt>Cut</dt><dd>{stone.cut}</dd></div>
          <div><dt>Lab</dt><dd>{stone.lab}</dd></div>
          <div><dt>Growth</dt><dd>{stone.growth}</dd></div>
          <div><dt>Status</dt><dd>{stone.availability}</dd></div>
        </dl>

        {/*
          The modal is where someone has actually looked at the stone, so this
          is the moment the enquiry is worth offering — and the message it
          builds carries the same record they have just been reading, polish
          and symmetry included, which the card's shorter summary leaves out.
        */}
        <div className={styles.actions}>
          <a
            className={styles.enquire}
            href={stoneEnquiryUrl(stone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Enquire on WhatsApp →
          </a>
          <a className={styles.enquireAlt} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
            Send a written enquiry
          </a>
        </div>
      </div>
    </div>
  );
}
