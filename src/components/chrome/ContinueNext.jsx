import { useCallback, useEffect, useRef, useState } from 'react';
import { navigateTo } from '@/lib/router.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { useT } from '@/i18n/localeContext.js';
import styles from './ContinueNext.module.css';

/**
 * Carries the visitor to the next page on its own, once they ask for it.
 *
 * The order is the tour a trade buyer actually walks: what we sell, what we
 * make with it, who we are, the shapes, the science, the journal, then how to
 * reach us. Contact is the end of the line and advances to nothing.
 *
 * Each stop names its destination by dictionary KEY, the same keys the nav
 * uses, so the pill and the menu call a page the same thing in every language.
 */
const JOURNEY = [
  { path: '/', key: 'nav.diamonds', next: '/diamonds' },
  { path: '/diamonds', key: 'nav.jewellery', next: '/jewellery' },
  { path: '/jewellery', key: 'nav.ourStory', next: '/about' },
  { path: '/about', key: 'educationTopics.shapes', next: '/shapes' },
  { path: '/shapes', key: 'nav.education', next: '/education' },
  { path: '/education', key: 'continueNext.journal', next: '/blogs' },
  { path: '/blogs', key: 'nav.contact', next: '/contact' },
];
/**
 * How much over-scroll past the foot of the page counts as "yes, continue".
 *
 * This is the whole safety mechanism. A TIMER would have been far easier and
 * would have been hostile: pulling a page out from under someone who is still
 * reading it is the single rudest thing a site can do, and there is no way to
 * distinguish "finished" from "paused to think" by clock. Over-scroll cannot
 * be produced by accident, cannot fire while anyone is reading the middle of a
 * page, and is abandoned the instant they scroll back up.
 */
const INTENT_PX = 180;
/**
 * Wheel deltas decay, so a single flick cannot coast into a navigation.
 *
 * 900/s was too greedy. It outran a SLOW deliberate scroll — someone easing
 * down at the foot of the page, which is precisely the person who means it —
 * so patient intent could never reach the threshold while an impatient flick
 * still could. At 420 a real gesture accumulates, and a single 300px flick
 * still drains away inside a second.
 */
const DECAY_PER_SECOND = 120;
/*
 * How close to the foot still counts as "at the end", and how far back up
 * counts as having changed your mind.
 *
 * These were one test at `gap < 4` and it was quietly self-defeating: the
 * smooth scroller nudges the page a few pixels as each wheel event lands, so
 * the very act of scrolling to continue pushed the gap past 4, cleared the
 * flag, and made the next wheel do nothing. The mechanism disabled itself
 * while being used. Arriving needs slack, and abandoning needs a deliberate
 * distance rather than a rounding error.
 */
const AT_END_PX = 72;
const ABANDON_PX = 220;

export default function ContinueNext({ path }) {
  const stop = JOURNEY.find((s) => s.path === path);
  const t = useT();
  const [progress, setProgress] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const intent = useRef(0);
  const fired = useRef(false);

  const go = useCallback(() => {
    if (fired.current || !stop) return;
    fired.current = true;
    navigateTo(stop.next);
  }, [stop]);

  useEffect(() => {
    // A new page is a fresh decision.
    intent.current = 0;
    fired.current = false;
  }, [path]);

  useEffect(() => {
    if (!stop) return undefined;

    // Reduced motion keeps the control — it is a link, and a useful one — but
    // never advances on its own. Automatic movement is exactly what that
    // setting asks the site not to do.
    const auto = !prefersReducedMotion();

    let last = performance.now();
    let raf = 0;

    const bottomGap = () => {
      const doc = document.documentElement;
      return doc.scrollHeight - (window.scrollY + window.innerHeight);
    };

    const onScroll = () => {
      const gap = bottomGap();
      setAtEnd(gap < AT_END_PX);
      if (gap > ABANDON_PX && intent.current > 0) {
        // Genuinely scrolled back into the page: the offer is withdrawn, not
        // merely paused. A few pixels of scroller bounce is not that.
        intent.current = 0;
        setProgress(0);
      }
    };

    const onWheel = (event) => {
      // Re-measured here rather than trusting the flag from the last scroll
      // event: wheel and scroll interleave, and acting on a one-frame-old
      // answer is what made this fail intermittently.
      if (!auto || fired.current || bottomGap() > AT_END_PX) return;
      // Only downward intent counts. Scrolling up at the foot of a page means
      // they want to go back into it.
      if (event.deltaY <= 0) return;
      intent.current = Math.min(INTENT_PX, intent.current + event.deltaY);
      setProgress(intent.current / INTENT_PX);
      if (intent.current >= INTENT_PX) go();
    };

    // Touch has no wheel event; the same idea expressed as a drag upward while
    // already at the foot of the page.
    let touchY = 0;
    const onTouchStart = (e) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e) => {
      if (!auto || fired.current || bottomGap() > AT_END_PX) return;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = touchY - y;
      touchY = y;
      if (dy <= 0) return;
      intent.current = Math.min(INTENT_PX, intent.current + dy * 2.6);
      setProgress(intent.current / INTENT_PX);
      if (intent.current >= INTENT_PX) go();
    };

    // Intent bleeds away, so a page left open at the bottom never drifts on by
    // itself and one hard flick cannot carry all the way to a navigation.
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (intent.current > 0 && !fired.current) {
        intent.current = Math.max(0, intent.current - DECAY_PER_SECOND * dt);
        setProgress(intent.current / INTENT_PX);
      }
      raf = requestAnimationFrame(tick);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(raf);
    };
  }, [stop, go, path]);

  if (!stop) return null;

  return (
    <a
      className={styles.root}
      href={stop.next}
      data-on={atEnd ? '' : undefined}
      /*
       * Out of the tab order until it is on screen.
       *
       * The control is always in the DOM so it can fade in, and CSS hides it
       * with opacity:0 and pointer-events:none. Neither of those removes it
       * from the tab sequence: a keyboard visitor pressing Tab on the home
       * page landed on stop 26 with no visible focus anywhere, and pressing
       * Enter there navigated them to another page they had no way of knowing
       * was selected. A control nobody can see must not be reachable, and
       * tabIndex is what says so — aria-hidden alone would leave it focusable.
       */
      tabIndex={atEnd ? undefined : -1}
      aria-hidden={atEnd ? undefined : 'true'}
      style={{ '--fill': progress.toFixed(3) }}
    >
      {/* Fills as they keep scrolling, so the site is visibly asking rather
          than deciding. If they stop, it drains back and nothing happens. */}
      <span className={styles.ring} aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <circle className={styles.track} cx="22" cy="22" r="19" />
          <circle className={styles.fill} cx="22" cy="22" r="19" pathLength="1" />
        </svg>
        <i className={styles.arrow} />
      </span>

      <span className={styles.text}>
        <b>{t('continueNext.continue')}</b>
        <em>{t(stop.key)}</em>
      </span>
    </a>
  );
}
