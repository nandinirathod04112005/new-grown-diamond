import { useEffect, useRef, useState } from 'react';

import { gsap } from '@/lib/motion/gsap.js';
import useMediaQuery from '@/hooks/useMediaQuery.js';
import styles from './Cursor.module.css';

/**
 * Custom cursor: a champagne ring that swells and labels itself over
 * interactive elements.
 *
 * Mounted ONLY under a fine pointer with motion allowed — never on touch,
 * where it would be a permanently stranded dot. The native cursor is hidden by
 * a class this component puts on <html>, so when it is not mounted the real
 * cursor is untouched rather than globally disabled by a stylesheet.
 */
export default function Cursor() {
  const enabled = useMediaQuery('(pointer: fine) and (prefers-reduced-motion: no-preference)');
  const dot = useRef(null);
  const ring = useRef(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;

    // Captured now: cleanup must not read `.current` after React may have
    // changed it.
    const ringEl = ring.current;
    const dotEl = dot.current;
    if (!ringEl || !dotEl) return undefined;

    document.documentElement.classList.add('ngd-has-cursor');

    const xTo = gsap.quickTo(ringEl, 'x', { duration: 0.42, ease: 'power3.out' });
    const yTo = gsap.quickTo(ringEl, 'y', { duration: 0.42, ease: 'power3.out' });
    const dxTo = gsap.quickTo(dotEl, 'x', { duration: 0.1, ease: 'power2.out' });
    const dyTo = gsap.quickTo(dotEl, 'y', { duration: 0.1, ease: 'power2.out' });

    const onMove = (e) => { xTo(e.clientX); yTo(e.clientY); dxTo(e.clientX); dyTo(e.clientY); };

    const onOver = (e) => {
      const hit = e.target.closest?.('[data-cursor], a, button');
      if (!hit) {
        setLabel('');
        gsap.to(ringEl, { scale: 1, duration: 0.3, ease: 'power3.out' });
        return;
      }
      setLabel(hit.dataset.cursor ?? '');
      gsap.to(ringEl, {
        scale: hit.dataset.cursor ? 2.6 : 1.7,
        duration: 0.35, ease: 'power3.out',
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.classList.remove('ngd-has-cursor');
      gsap.killTweensOf([ringEl, dotEl]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={styles.wrap} aria-hidden="true">
      <span ref={ring} className={styles.ring}>
        <span className={styles.label}>{label}</span>
      </span>
      <span ref={dot} className={styles.dot} />
    </div>
  );
}
