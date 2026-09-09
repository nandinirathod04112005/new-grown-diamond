import { useState } from 'react';

import { useTilt } from '@/hooks/useTilt.js';
import { stoneEnquiryUrl } from '@/lib/whatsapp.js';
import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './DiamondCard.module.css';

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : '—');

/**
 * One stone.
 *
 * A missing or unreachable photograph is a normal state, not an error: stock
 * is often entered before it is shot. Both cases fall back to the house macro
 * image so the grid never shows a broken frame.
 */
export default function DiamondCard({ stone, index = 0, onInspect }) {
  const [broken, setBroken] = useState(false);
  const tilt = useTilt({ max: 5.5, scale: 1.03 });
  const src = !broken && stone.imageUrl ? stone.imageUrl : fallback;
  const isFallback = broken || !stone.imageUrl;

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
        <div className={styles.shot}>
        <img
          src={src}
          alt={`${fmt(stone.carat)} carat ${stone.shape} diamond, ${stone.colour} ${stone.clarity}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
        {isFallback && <span className={styles.noShot}>Photograph on request</span>}
        {stone.featured && <span className={styles.featured}>Featured</span>}
        <span className={styles.stock} data-in={stone.availability === 'In Stock' ? '' : undefined}>
          {stone.availability}
        </span>
          <button type="button" className={styles.inspect} onClick={() => onInspect?.(stone)}>
            <span>Photograph · Certificate · Details</span>
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.ref}>{stone.stockNumber}</p>
          <h3 className={styles.title}>
            {fmt(stone.carat)} ct <span>{stone.shape}</span>
          </h3>
          <dl className={styles.specs}>
            <div><dt>Colour</dt><dd>{stone.colour}</dd></div>
            <div><dt>Clarity</dt><dd>{stone.clarity}</dd></div>
            <div><dt>Cut</dt><dd>{stone.cut}</dd></div>
            <div><dt>Lab</dt><dd>{stone.lab}</dd></div>
          </dl>
          <p className={styles.growth}>{stone.growth}</p>
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
            Enquire on WhatsApp →
          </a>
          <a className={styles.enquireAlt} href={`/contact?stone=${encodeURIComponent(stone.stockNumber)}`}>
            Send a written enquiry
          </a>
        </div>
      </div>
    </article>
  );
}
