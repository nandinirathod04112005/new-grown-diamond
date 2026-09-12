import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Rail.copy.js';
import styles from './Rail.module.css';

/**
 * A horizontal rail with arrows and a progress line — the old journal's
 * carousel, rebuilt on native scrolling.
 *
 * The track is an ordinary overflow scroller with scroll-snap, so a trackpad
 * swipe, a touch drag, a keyboard arrow and a screen reader's own navigation
 * all work without a script. The arrows only scroll it by a page; the line
 * only reports where it is. With nothing to scroll, both step aside.
 */
export default function Rail({ label, items, renderItem, variant = 'cards', getKey }) {
  const track = useRef(null);
  const [state, setState] = useState({ progress: 0, atStart: true, atEnd: true, scrollable: false });
  const c = useCopy(COPY);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const scrollable = max > 4;
    setState({
      progress: scrollable ? el.scrollLeft / max : 1,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
      scrollable,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(el);
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [measure, items.length]);

  const page = (dir) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={styles.rail} data-variant={variant} data-scrollable={state.scrollable ? '' : undefined}>
      <ul
        ref={track}
        className={styles.track}
        aria-label={label}
        /* Focusable so a keyboard can scroll it; there is no other control
           inside a title-only rail to land on first. */
        tabIndex={0}
      >
        {items.map((item, i) => (
          <li key={getKey ? getKey(item) : i} className={styles.item}>
            {renderItem(item, i)}
          </li>
        ))}
      </ul>

      <div className={styles.controls} hidden={!state.scrollable}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => page(-1)}
          disabled={state.atStart}
          aria-label={interpolate(c.previous, { label })}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <span className={styles.line} aria-hidden="true">
          <span className={styles.fill} style={{ '--p': state.progress }} />
        </span>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => page(1)}
          disabled={state.atEnd}
          aria-label={interpolate(c.next, { label })}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
