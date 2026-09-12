import { useState } from 'react';

import { useTilt } from '@/hooks/useTilt.js';
import { resizedImage, resizedSrcSet } from '@/lib/storageImages.js';
import { stoneEnquiryUrl } from '@/lib/whatsapp.js';
import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { shapeName } from './shapeNames.js';
import { carat as fmtCarat, money, text } from './stoneFormat.js';
import COPY from './DiamondCard.copy.js';
import styles from './DiamondCard.module.css';
import { useCart } from '@/cart/useCart.js';
import { useWishlist } from '@/wishlist/useWishlist.js';

/**
 * One stone.
 *
 * Laid out the way a trade stock list is read: the report number across the
 * top, because that is what a buyer looks up; the photograph; the grade; the
 * finish; the price. The whole photograph opens the full record — a small
 * button inside the picture was the only way in before, and people click the
 * stone, not the label on it.
 *
 * A missing or unreachable photograph is a normal state, not an error: stock
 * is often entered before it is shot. Both cases fall back to the house macro
 * image so the grid never shows a broken frame.
 */
export default function DiamondCard({ stone, index = 0, onInspect }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const { locale, t } = useLocale();
  const c = useCopy(COPY);
  const saved = wishlist?.has(stone.publicId) ?? false;
  /* Failed loads so far: 0 shows the resized copy, 1 the uploaded original
     (should resizing ever be unavailable), 2 the house artwork. */
  const [failed, setFailed] = useState(0);
  /* Set, to the picture's own address, when filling the 4:3 frame would cut
     away more than a fifth of the photograph — an upright phone photo, say,
     where filling it kept a jacket and lost the stone. Such a photo is shown
     whole instead, over a blurred copy of itself. */
  const [whole, setWhole] = useState('');
  const tilt = useTilt({ max: 5.5, scale: 1.03 });
  const original = stone.imageUrl || '';
  const isFallback = failed >= 2 || !original;
  const src = isFallback ? fallback : failed === 1 ? original : resizedImage(original, 800);
  const srcSet = !isFallback && failed === 0 ? resizedSrcSet(original) : undefined;

  const measure = (event) => {
    const img = event.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (!ratio) return;
    setWhole(Math.min(ratio, 4 / 3) / Math.max(ratio, 4 / 3) < 0.8 ? img.currentSrc || img.src : '');
  };

  const ct = fmtCarat(stone.carat) ?? '—';
  const lab = text(stone.lab);
  const report = text(stone.reportNumber);
  const price = money(stone.price, stone.currency);
  const growth = text(stone.growth);
  /* Shown in the visitor's language; the stored values stay as they are. */
  const shape = shapeName(stone.shape, locale);
  const availability = Object.hasOwn(c.availability, stone.availability)
    ? c.availability[stone.availability]
    : stone.availability;

  /* Polish, symmetry and fluorescence: the three grades the card never showed,
     and the three a trade buyer checks straight after colour and clarity. */
  const finish = [
    [c.finish.polish, text(stone.polish)],
    [c.finish.sym, text(stone.symmetry)],
    [c.finish.fluor, text(stone.fluorescence)],
  ].filter(([, v]) => v);

  const open = () => onInspect?.(stone);

  return (
    <article ref={tilt} className={styles.card} style={{ '--i': index }}>
      {/*
        The plane carries the rotation and the card's whole surface. It has to
        be a separate element from `.card`: the card clips its own corners with
        overflow, and an element that both clips and declares preserve-3d is
        forced flat by the spec — the layers below would silently collapse into
        the face with no error to show for it.
      */}
      <div className={styles.plane}>
        <span className={styles.gloss} aria-hidden="true" />
        <span className={styles.rim} aria-hidden="true" />

        {/* The strip: what the stone is filed under. */}
        <div className={styles.strip}>
          <span className={styles.stripRef}>
            {report ? interpolate(c.report, { report }) : stone.stockNumber}
          </span>
          {lab && <span className={styles.labBadge}>{lab}</span>}
        </div>

        <div className={styles.shot} data-whole={whole ? '' : undefined}>
          {/* Behind a photograph shown whole: the same picture, blurred, so the
              frame around it reads as its own light rather than empty bars. */}
          {whole && (
            <span
              className={styles.shotFill}
              style={{ backgroundImage: `url("${whole.replace(/"/g, '%22')}")` }}
              aria-hidden="true"
            />
          )}
          <img
            src={src}
            srcSet={srcSet}
            sizes={srcSet ? '(max-width: 767px) 92vw, 420px' : undefined}
            alt={interpolate(c.alt, { ct, shape, colour: stone.colour, clarity: stone.clarity })}
            loading="lazy"
            decoding="async"
            onLoad={measure}
            onError={() => { setWhole(''); setFailed((n) => n + 1); }}
          />
          {isFallback && <span className={styles.noShot}>{c.noShot}</span>}
          {stone.featured && <span className={styles.featured}>{c.featured}</span>}
          <span className={styles.stock} data-in={stone.availability === 'In Stock' ? '' : undefined}>
            {availability}
          </span>
          {/* The whole photograph is the way in. One real button covering it,
              named for what it opens, so keyboard and screen readers get the
              same target the mouse does. */}
          <button
            type="button"
            className={styles.open}
            onClick={open}
            aria-label={interpolate(c.open, { ct, shape, stock: stone.stockNumber })}
          >
            <span className={styles.inspect} aria-hidden="true">
              {c.inspect}
            </span>
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.ref}>
            {stone.stockNumber}
            {growth && <span className={styles.refGrowth}> · {growth}</span>}
          </p>
          <h3 className={styles.title}>
            {ct} ct <span>{shape}</span>
          </h3>
          <dl className={styles.specs}>
            <div><dt>{t('terms.colour')}</dt><dd>{stone.colour}</dd></div>
            <div><dt>{t('terms.clarity')}</dt><dd>{stone.clarity}</dd></div>
            <div><dt>{t('terms.cut')}</dt><dd>{stone.cut}</dd></div>
            <div><dt>{t('terms.lab')}</dt><dd>{stone.lab}</dd></div>
          </dl>

          {finish.length > 0 && (
            <p className={styles.finish}>
              {finish.map(([k, v]) => (
                <span key={k}>
                  {k} <b>{v}</b>
                </span>
              ))}
            </p>
          )}

          <div className={styles.priceRow}>
            {price ? (
              <p className={styles.price}>
                {price}
                <small>{stone.currency}</small>
              </p>
            ) : (
              <p className={styles.priceAsk}>{t('terms.priceOnRequest')}</p>
            )}
            <button type="button" className={styles.details} onClick={open} tabIndex={-1} aria-hidden="true">
              {c.details} →
            </button>
          </div>

          {/* Selection and wishlist side by side: one is "ask about this",
              the other is "keep this in mind", and a buyer decides between
              them in the same glance. */}
          <div className={styles.cartRow}>
            <button
              type="button"
              className={styles.addCart}
              data-added={cart.has(stone.publicId) ? '' : undefined}
              onClick={() => cart.add(stone)}
            >
              {cart.has(stone.publicId) ? c.added : c.add}
            </button>
            {wishlist && (
              <button
                type="button"
                className={styles.wish}
                aria-pressed={saved}
                aria-label={interpolate(saved ? c.unsave : c.save, { stock: stone.stockNumber })}
                title={saved ? c.savedTitle : c.saveTitle}
                onClick={() => wishlist.toggle(stone)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                  <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
                </svg>
              </button>
            )}
          </div>

          {/*
            Two ways to ask, in the order people actually use them.

            WhatsApp goes first because it is the one that costs the buyer
            nothing — the message arrives already describing the stone, so
            neither side has to retype a stock number. The form stays because
            it is the one that leaves a record: it writes to Supabase and hands
            back a reference, which a chat thread does not.
          */}
          <a
            className={styles.enquire}
            href={stoneEnquiryUrl(stone)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('common.enquireOnWhatsApp')} →
          </a>
          <a className={styles.enquireAlt} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
            {t('common.writtenEnquiry')}
          </a>
        </div>
      </div>
    </article>
  );
}
