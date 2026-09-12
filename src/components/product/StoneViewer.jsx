import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { useCart } from '@/cart/useCart.js';
import { useWishlist } from '@/wishlist/useWishlist.js';
import { getDiamond } from '@/lib/supabase/queries/diamonds.js';
import { resizedImage, resizedSrcSet } from '@/lib/storageImages.js';
import { stoneEnquiryUrl } from '@/lib/whatsapp.js';
import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { carat as fmtCarat, money, percent, ratio, text } from './stoneFormat.js';
import { FACETS } from './facets.js';
import GradeScale from './GradeScale.jsx';
import { shapeName } from './shapeNames.js';
import Stone360Stage from './Stone360Stage.jsx';
import { SideView, TopView } from './StoneDiagrams.jsx';
import StoneSize from './StoneSize.jsx';
import { parseMeasurements, shapeKey, verifyLink } from './stoneGeometry.js';
import COPY from './StoneViewer.copy.js';
import styles from './StoneViewer.module.css';

/**
 * The full record of one stone: every grade, every proportion, the
 * photograph up close and the report.
 *
 * LAID OUT LIKE A TRADE DIAMOND VIEW. A summary line across the top in the
 * order the trade reads a stone — shape, weight, colour, clarity, cut, polish,
 * symmetry — then the record in labelled sections on the left (details,
 * measurement, additional information, price) and the media on the right, with
 * the certificate across the foot. Each section is two columns of label and
 * value, filled across then down, so the pairs sit where a buyer who uses these
 * sheets every day already looks for them.
 *
 * TWO READS, ONE PICTURE. It opens instantly from the card already on screen,
 * then asks for the full row — proportions, location, certificate number,
 * price per carat — which the grid never loads. Until that arrives those rows
 * show a placeholder rather than a dash, because a dash would claim the value
 * is missing when it simply has not been read yet. If the read fails the card's
 * own fields still stand, and only the extra rows fall back to a dash.
 *
 * ONLY FIELDS THE TABLE HOLDS. Crown and pavilion angles, girdle, shade and
 * milkiness are not columns on the diamonds table, so they are not rows here:
 * a row that could only ever read "—" is noise, not structure.
 *
 * A dialog rather than a route because it is a closer look at the row already
 * on screen — sending someone to another page to zoom loses their place in a
 * long grid. Focus is trapped while open, Escape closes, the page behind is
 * scroll-locked, and focus returns to whatever opened it.
 *
 * RENDERED INTO document.body, and it has to be. The inventory sits inside a
 * transformed, z-indexed ancestor, which is a stacking context — so this
 * overlay's z-index was being compared against its siblings inside that box
 * rather than against the page, and the fixed header painted straight over
 * the top of the dialog, close button included. A portal puts the overlay in
 * the root stacking context, where its z-index means what it says.
 */

/* Sentinel for "not read yet", distinct from null ("read, and empty"). */
const PENDING = Symbol('pending');

export default function StoneViewer({ stone, onClose }) {
  const [row, setRow] = useState(null);
  const [read, setRead] = useState('loading'); // loading | ready | failed
  const [media, setMedia] = useState('photo'); // photo | spin | top | side | size | cert
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);
  const panel = useRef(null);
  const opener = useRef(null);
  const cart = useCart();
  const wishlist = useWishlist();
  const { locale, t } = useLocale();
  const c = useCopy(COPY);
  const inCart = cart.has(stone.publicId);
  const saved = wishlist?.has(stone.publicId) ?? false;

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

  /* The full row. Every state write happens after the await, and a stale
     answer for a stone that is no longer open is dropped. */
  useEffect(() => {
    let live = true;
    getDiamond(stone.publicId)
      .then((data) => {
        if (!live) return;
        setRow(data);
        setRead('ready');
      })
      .catch((err) => {
        console.error('[NGD Inventory] detail load failed:', err);
        if (live) setRead('failed');
      });
    return () => {
      live = false;
    };
  }, [stone.publicId]);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panel.current?.querySelectorAll(
        'button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
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

  /* A field only the full row carries: pending until it is read, then its
     value or null. */
  const late = (pick) => (read === 'loading' ? PENDING : row ? pick(row) : null);

  const src = stone.imageUrl || fallback;
  const cert = text(row?.certificate_url ?? stone.certificate_url);
  const ct = fmtCarat(stone.carat);
  const report = text(row?.report_number ?? stone.reportNumber);
  const lab = text(stone.lab);
  const shape = shapeKey(stone.shape);
  const measured = parseMeasurements(row?.measurements);
  const verify = verifyLink(lab, report);
  /* Shown in the visitor's language; the stored values stay as they are. */
  const shapeLabel = shapeName(stone.shape, locale);
  const availability = text(stone.availability);
  const availabilityLabel = availability && Object.hasOwn(c.availability, availability)
    ? c.availability[availability]
    : availability;

  /*
   * The views a buyer can switch between. 360° is offered only for round
   * stones — the only 3D model there is — and the top view only for shapes
   * that have a facet drawing. Each one is labelled for what it is.
   */
  const VIEWS = [
    { key: 'photo', label: c.views.photo, icon: <img src={resizedImage(src, 160)} alt="" /> },
    shape === 'Round' && { key: 'spin', label: c.views.spin, icon: <Glyph360 /> },
    shape && { key: 'top', label: c.views.top, icon: <GlyphTop shape={shape} /> },
    { key: 'side', label: c.views.side, icon: <GlyphSide /> },
    { key: 'size', label: c.views.size, icon: <GlyphRing /> },
    cert && { key: 'cert', label: c.views.cert, icon: <span className={styles.docIcon} aria-hidden="true" /> },
  ].filter(Boolean);

  function copyReport() {
    if (!report || !navigator.clipboard) return;
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  }

  /* Across then down, in the order the reference sheet pairs them. */
  const DETAILS = [
    [t('terms.shape'), text(shapeLabel)],
    [c.rows.stockNo, text(stone.stockNumber)],
    [t('terms.carat'), ct],
    [t('terms.cut'), text(stone.cut)],
    [t('terms.colour'), text(stone.colour)],
    [t('terms.polish'), text(stone.polish)],
    [t('terms.clarity'), text(stone.clarity)],
    [t('terms.symmetry'), text(stone.symmetry)],
    [t('terms.lab'), lab],
    [t('terms.fluorescence'), text(stone.fluorescence)],
    [c.rows.location, late((r) => text(r.location))],
    [c.rows.reportNo, report],
  ];

  const MEASURE = [
    [c.rows.table, late((r) => percent(r.table_percentage))],
    [c.rows.depth, late((r) => percent(r.depth_percentage))],
    [c.rows.ratio, late((r) => ratio(r.ratio))],
    [c.rows.measurements, late((r) => text(r.measurements)), 'wide'],
  ];

  const MORE = [
    [c.rows.growth, text(stone.growth)],
    [c.rows.certificateNo, late((r) => text(r.certificate_number))],
    [c.rows.availability, availabilityLabel],
  ];

  /* Price only exists here if the admin published it; the flag is checked on
     the row itself, never assumed from the card. */
  const showPrice = row?.price_visible && Number(row?.total_price) > 0;
  const PRICE = showPrice
    ? [
        [c.rows.total, money(row.total_price, row.currency || 'USD')],
        [c.rows.perCarat, money(row.price_per_carat, row.currency || 'USD')],
      ]
    : null;

  /* The trade's one-line summary, in the order it is always read. */
  const summary = [
    text(stone.stockNumber),
    text(shapeLabel),
    ct,
    text(stone.colour),
    text(stone.clarity),
    text(stone.cut),
    text(stone.polish),
    text(stone.symmetry),
  ].filter(Boolean);

  const title = interpolate(c.title, { ct: ct ?? '', shape: shapeLabel, stock: stone.stockNumber });

  return createPortal(
    <div className={styles.scrim} onClick={onClose} role="presentation">
      <div
        ref={panel}
        className={styles.panel}
        /* The panel scrolls its own overflow; without this the smooth
           scroller takes the wheel and moves the page behind the dialog. */
        data-lenis-prevent=""
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------------- the summary bar ---------------- */}
        <header className={styles.head}>
          <div className={styles.headText}>
            <p className={styles.eyebrow}>{c.eyebrow}</p>
            <h2 className={styles.title}>
              {ct ?? '—'} ct <span>{shapeLabel}</span>
            </h2>
          </div>
          <p className={styles.summary} aria-label={c.summary}>
            <span aria-hidden="true">[</span>
            {summary.map((s, i) => (
              <b key={`${s}-${i}`}>{s}</b>
            ))}
            <span aria-hidden="true">]</span>
          </p>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('nav.close')}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className={styles.body}>
          {/* ---------------- the record ---------------- */}
          <div className={styles.record}>
            <Section title={c.sections.details} items={DETAILS} index={0} />
            <GradeScale
              colour={stone.colour}
              clarity={stone.clarity}
              cut={stone.cut}
              className={styles.section}
              heading={<h3 className={styles.sectionHead}>{c.sections.grading}</h3>}
            />
            <Section title={c.sections.measurement} items={MEASURE} index={1} />
            <Section title={c.sections.more} items={MORE} index={2} />
            {PRICE && <Section title={t('terms.price')} items={PRICE} index={3} emphasis />}
            {read === 'failed' && (
              <p className={styles.note}>
                {c.failed}
              </p>
            )}
          </div>

          {/* ---------------- the media ---------------- */}
          <section className={styles.media} style={{ '--i': 1 }} aria-labelledby="stone-media">
            <h3 id="stone-media" className={styles.sectionHead}>{c.media}</h3>
            <div className={styles.stage}>
              {media === 'photo' && (
                <div
                  className={styles.zoomStage}
                  data-zoom={zoom ? '' : undefined}
                  onMouseMove={track}
                  onClick={() => setZoom((z) => !z)}
                  role="button"
                  tabIndex={0}
                  aria-label={zoom ? c.zoomOut : c.zoomIn}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setZoom((z) => !z);
                    }
                  }}
                >
                  {/* A resized copy to look at; the uploaded original only once
                      someone zooms, which is when its pixels are wanted. */}
                  <img
                    src={zoom ? src : resizedImage(src, 1200)}
                    srcSet={zoom ? undefined : resizedSrcSet(src, [800, 1200, 1800])}
                    sizes="(max-width: 900px) 100vw, 50vw"
                    alt={interpolate(c.photoAlt, { shape: shapeLabel, stock: stone.stockNumber })}
                  />
                  <span className={styles.hint}>{zoom ? c.hintZoomOut : c.hintZoom}</span>
                </div>
              )}
              {media === 'spin' && <Stone360Stage />}
              {media === 'top' && <TopView shape={stone.shape} length={measured?.length} width={measured?.width} />}
              {media === 'side' && (
                <SideView shape={stone.shape} table={row?.table_percentage} depth={row?.depth_percentage} />
              )}
              {media === 'size' && <StoneSize shape={stone.shape} carat={stone.carat} measured={measured} />}
              {/*
                NOT AN IFRAME.
                This was `<iframe src={cert}>`, and it could never have worked:
                IGI answers with `X-Frame-Options: SAMEORIGIN`, and every other
                grading laboratory does the same. The browser refuses to draw
                the page and says nothing, so the Certificate tab was a black
                rectangle — the stone looked uncertified, which is the opposite
                of what this panel exists to say.

                It cannot be fixed from our side, and it should not be: a
                report is proof BECAUSE it is read on the laboratory's own
                domain. So the panel states the report, and hands the visitor
                over to the laboratory to read it.
              */}
              {media === 'cert' && cert && (
                <div className={styles.certPanel}>
                  <span className={styles.certSeal} aria-hidden="true" />
                  <p className={styles.certPanelTitle}>
                    {interpolate(c.cert.framedTitle, { lab: lab ?? c.cert.laboratory })}
                  </p>
                  <p className={styles.certPanelBody}>{c.cert.framedBody}</p>
                  <a className={styles.certPanelBtn} href={cert} target="_blank" rel="noopener noreferrer">
                    {interpolate(c.cert.framedOpen, { number: report ?? '', lab: lab ?? '' }).replace(/\s+/g, ' ').trim()}
                    <i aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>

            {/* Thumbnails, the way the reference switches views. The report
                gets one only when there is a report to show. */}
            <div className={styles.thumbs} role="group" aria-label={c.viewsLabel}>
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={styles.thumb}
                  aria-pressed={media === v.key}
                  onClick={() => {
                    setZoom(false);
                    setMedia(v.key);
                  }}
                >
                  {v.icon}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* ---------------- the certificate ---------------- */}
        <section className={styles.certificate} style={{ '--i': 4 }} aria-labelledby="stone-cert">
          <h3 id="stone-cert" className={styles.sectionHead}>{c.cert.title}</h3>
          <div className={styles.certBody}>
            <dl className={styles.certFacts}>
              <div><dt>{c.cert.laboratory}</dt><dd>{lab ?? '—'}</dd></div>
              <div><dt>{c.rows.reportNo}</dt><dd>{report ?? '—'}</dd></div>
              <div>
                <dt>{c.rows.certificateNo}</dt>
                <dd><Value v={late((r) => text(r.certificate_number))} /></dd>
              </div>
            </dl>
            <div className={styles.certActions}>
              {/* The lab's own record is the real proof, so it comes first. */}
              {verify && (
                <a className={styles.verifyBtn} href={verify.href} target="_blank" rel="noopener noreferrer">
                  {interpolate(c.cert.verify, { lab: verify.lab })}
                  <i aria-hidden="true" />
                </a>
              )}
              {report && (
                <button type="button" className={styles.copyBtn} onClick={copyReport} aria-live="polite">
                  {copied ? c.cert.copied : c.cert.copy}
                </button>
              )}
            </div>
            {cert ? (
              <a className={styles.certLink} href={cert} target="_blank" rel="noopener noreferrer">
                {c.cert.open} →
              </a>
            ) : (
              <div className={styles.certAsk}>
                <p>{c.cert.missing}</p>
                <a className={styles.certLink} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
                  {c.cert.request} →
                </a>
              </div>
            )}
          </div>
        </section>

        {/*
          The dialog is where someone has actually looked at the stone, so this
          is the moment the enquiry is worth offering — and the message it
          builds carries the same record they have just been reading.
        */}
        <div className={styles.actions}>
          {/* Keep it, or ask about it. Both before the enquiry links, because
              someone comparing stones usually wants the first. */}
          <div className={styles.keep}>
            <button
              type="button"
              className={styles.addCart}
              data-added={inCart ? '' : undefined}
              onClick={() => cart.add({ ...stone, price: stone.price ?? null })}
              disabled={inCart}
            >
              {inCart ? c.inSelection : c.add}
            </button>
            {wishlist && (
              <button
                type="button"
                className={styles.wish}
                aria-pressed={saved}
                onClick={() => wishlist.toggle(stone)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
                  <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
                </svg>
                {saved ? c.saved : c.save}
              </button>
            )}
          </div>
          <a className={styles.enquire} href={stoneEnquiryUrl(stone)} target="_blank" rel="noopener noreferrer">
            {t('common.enquireOnWhatsApp')} →
          </a>
          <a className={styles.enquireAlt} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
            {t('common.writtenEnquiry')}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
/* A value, a dash for empty, or a placeholder while it is still being read. */
function Value({ v }) {
  const c = useCopy(COPY);
  if (v === PENDING) return <span className={styles.pending} aria-label={c.loading} />;
  return v ?? '—';
}

function Section({ title, items, index, emphasis = false }) {
  return (
    <section className={`${styles.section} ${emphasis ? styles.emphasis : ''}`} style={{ '--i': index }}>
      <h3 className={styles.sectionHead}>{title}</h3>
      <dl className={styles.fields}>
        {items.map(([label, value, span]) => (
          <div key={label} className={span === 'wide' ? styles.wide : undefined}>
            <dt>{label}</dt>
            <dd>
              <Value v={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---- thumbnail glyphs: drawn, so there is no icon file to go missing ---- */
function Glyph360() {
  return (
    <svg className={styles.glyph} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M18 14 H30 L35 19 L24 30 L13 19 Z" />
      <ellipse cx="24" cy="30" rx="18" ry="6" />
      <path d="M37 25.5 L42 29 L36.5 32.5" />
    </svg>
  );
}

function GlyphTop({ shape }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {FACETS[shape].f.map((f, i) => <path key={i} d={f.d} className={styles.glyphFacet} />)}
      <path d={FACETS[shape].o} />
    </svg>
  );
}

function GlyphSide() {
  return (
    <svg className={styles.glyph} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M16 14 H32 L42 21 L24 38 L6 21 Z" />
      <path d="M6 21 H42 M16 14 L13 21 M32 14 L35 21 M24 21 L24 38" className={styles.glyphFacet} />
    </svg>
  );
}

function GlyphRing() {
  return (
    <svg className={styles.glyph} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="30" r="11" />
      <path d="M19 15 H29 L32 19 L24 26 L16 19 Z" />
    </svg>
  );
}
