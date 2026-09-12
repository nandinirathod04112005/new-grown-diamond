import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Heart, ShoppingBag, Trash2 } from 'lucide-react';

import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { useCart } from '@/cart/useCart.js';
import { carat as fmtCarat, money, text } from '@/components/product/stoneFormat.js';
import StoneViewer from '@/components/product/StoneViewer.jsx';
import { listDiamondsByIds } from '@/lib/supabase/queries/diamonds.js';
import { isConfigured } from '@/lib/supabase/client.js';
import { resizedImage } from '@/lib/storageImages.js';
import { useWishlist } from '@/wishlist/useWishlist.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './WishlistPage.copy.js';
import styles from './WishlistPage.module.css';

/**
 * Saved stones.
 *
 * A wishlist remembers a stone as it was when it was saved, and stock moves:
 * a stone saved last week may be sold today. So the saved list is drawn at
 * once from what was remembered, then checked against live inventory — the
 * same public read the stock page makes — and each stone is marked with where
 * it stands now. A stone that has left the inventory stays on the list,
 * marked, so the buyer can see what went rather than having it vanish; it just
 * cannot be added to the selection.
 */
export default function WishlistPage() {
  const wishlist = useWishlist();
  const cart = useCart();
  const { t } = useLocale();
  const c = useCopy(COPY);
  const [live, setLive] = useState(null); // Map of publicId -> live stone, once read
  const [check, setCheck] = useState(() => (isConfigured ? 'checking' : 'off'));
  const [viewing, setViewing] = useState(null);

  const saved = useMemo(() => wishlist?.items ?? [], [wishlist?.items]);

  useEffect(() => {
    if (!isConfigured) return undefined;
    let alive = true;
    listDiamondsByIds(saved.map((item) => item.publicId))
      .then((rows) => {
        if (!alive) return;
        setLive(new Map(rows.map((row) => [row.publicId, row])));
        setCheck('done');
      })
      .catch((err) => {
        console.error('[NGD Wishlist] live stock check failed:', err);
        if (alive) setCheck('failed');
      });
    return () => {
      alive = false;
    };
  }, [saved]);

  /* Each saved stone, with live data laid over the snapshot where it exists. */
  const rows = saved.map((item) => {
    const now = live?.get(item.publicId);
    const gone = check === 'done' && !now;
    return { item, stone: now ? { ...item, ...now } : item, gone };
  });

  const addable = rows.filter((r) => !r.gone && !cart.has(r.item.publicId));

  if (!wishlist) return null;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{interpolate(c.eyebrow, { n: String(saved.length).padStart(2, '0') })}</p>
        <h1>
          {c.title.lead}<em>{c.title.em}</em>
        </h1>
        <span>
          {c.intro}
        </span>
      </header>

      {saved.length === 0 ? (
        <section className={styles.empty}>
          <Heart size={38} strokeWidth={1} aria-hidden="true" />
          <h2>{c.empty.title}</h2>
          <p>{c.empty.body}</p>
          <a href="/diamonds">
            {t('common.exploreDiamonds')} <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </section>
      ) : (
        <>
          <div className={styles.toolbar}>
            <p className={styles.status} role="status">
              {check === 'checking' && c.status.checking}
              {check === 'done' && c.status.done}
              {check === 'failed' && c.status.failed}
              {check === 'off' && c.status.off}
            </p>
            <div className={styles.toolActions}>
              <button
                type="button"
                className={styles.primary}
                disabled={addable.length === 0}
                onClick={() => addable.forEach((r) => cart.add(r.stone))}
              >
                <ShoppingBag size={16} aria-hidden="true" />
                {addable.length > 0 ? interpolate(c.addAll, { n: addable.length }) : c.allIn}
              </button>
              <button type="button" className={styles.quiet} onClick={wishlist.clear}>
                {c.clear}
              </button>
            </div>
          </div>

          <ul className={styles.grid}>
            {rows.map(({ item, stone, gone }, i) => {
              const ct = fmtCarat(stone.carat) ?? '—';
              const price = money(stone.price, stone.currency);
              const inCart = cart.has(item.publicId);
              return (
                <li key={item.publicId} className={styles.card} style={{ '--i': i }} data-gone={gone ? '' : undefined}>
                  <button
                    type="button"
                    className={styles.shot}
                    onClick={() => setViewing(stone)}
                    disabled={gone}
                    aria-label={interpolate(c.view, { carat: ct, shape: stone.shape, stock: stone.stockNumber })}
                  >
                    <img src={resizedImage(stone.imageUrl, 320) || fallback} alt="" loading="lazy" decoding="async" />
                    {gone ? (
                      <span className={styles.badgeGone}>{c.gone}</span>
                    ) : (
                      text(stone.availability) && <span className={styles.badge}>{stone.availability}</span>
                    )}
                  </button>

                  <div className={styles.body}>
                    <p className={styles.ref}>{stone.stockNumber}</p>
                    <h2 className={styles.title}>
                      {ct} ct <span>{stone.shape}</span>
                    </h2>
                    <p className={styles.grades}>
                      {[stone.colour, stone.clarity, stone.cut, stone.lab].filter((v) => text(v)).join(' · ')}
                    </p>
                    <p className={price ? styles.price : styles.priceAsk}>{price ?? t('terms.priceOnRequest')}</p>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.add}
                        disabled={gone || inCart}
                        onClick={() => cart.add(stone)}
                      >
                        {inCart ? c.inSelection : c.add}
                      </button>
                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() => wishlist.remove(item.publicId)}
                        aria-label={interpolate(c.removeLabel, { stock: stone.stockNumber })}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className={styles.note}>
            {c.note}
          </p>
          <a className={styles.back} href="/diamonds">
            <ArrowLeft size={16} aria-hidden="true" /> {c.back}
          </a>
        </>
      )}

      {viewing && <StoneViewer stone={viewing} onClose={() => setViewing(null)} />}
    </main>
  );
}
