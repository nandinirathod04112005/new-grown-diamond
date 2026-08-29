import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { supports3D } from '@/components/three/capability.js';
import styles from './Genesis.module.css';

const GenesisField = lazy(() => import('@/components/three/GenesisField.jsx'));

/**
 * Chapter 01 — carbon becomes crystal.
 *
 * Pinned, and the pin earns itself: the scroll IS the growth. Progress drives
 * the particle field from a loose carbon cloud to the surface of the finished
 * stone, while three captions cross-fade to narrate what the reactor is doing.
 *
 * The science stays prose. No gauges, no read-outs, no dashboard — a reactor
 * described the way a process is described in a good catalogue.
 */
const BEATS = [
  { at: 0.06, k: 'Seed', t: 'A sliver of diamond, half a millimetre across, is placed in the chamber. Everything that follows grows from it.' },
  { at: 0.4, k: 'Plasma', t: 'Methane and hydrogen are excited into plasma at eight hundred degrees. Carbon separates, and goes looking for somewhere to sit.' },
  { at: 0.72, k: 'Lattice', t: 'It finds the seed. Atom by atom, in the same cubic lattice the earth uses, a diamond thickens by a fraction of a millimetre an hour.' },
];

export default function Genesis() {
  const scope = useRef(null);
  const progress = useRef(0);
  const [beat, setBeat] = useState(0);
  const [use3D, setUse3D] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setUse3D(supports3D()));
    return () => cancelAnimationFrame(id);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Pinning is desktop-only: on a phone it hijacks the one gesture the
      // user has, and the payoff does not justify that.
      mm.add(MQ.desktop, () => {
        const st = ScrollTriggerFrom(scope.current, progress, setBeat, setActive);
        return () => st.kill();
      });

      // Small screens and reduced motion: the field settles to its final
      // state and the captions simply stack as readable prose.
      mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
        progress.current = 1;
        setActive(false);
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} id="genesis" className={styles.genesis} aria-labelledby="genesis-title">
      <div className={styles.stage}>
        <div className={styles.field}>
          {use3D ? (
            <Suspense fallback={null}>
              <GenesisField progress={progress} active={active} />
            </Suspense>
          ) : (
            /* Low-power fallback: a still lattice, no canvas, no cost. */
            <div className={styles.lattice} aria-hidden="true" />
          )}
        </div>

        <div className={`ngd-page ngd-grid ${styles.inner}`}>
          <p className={`ngd-tech ${styles.chapter}`}>Chapter 01 — Genesis</p>

          <SplitReveal as="h2" id="genesis-title" className={styles.title}>
            Nothing becomes something, slowly.
          </SplitReveal>

          <div className={styles.beats}>
            {BEATS.map((b, i) => (
              <div
                key={b.k}
                className={`${styles.beat} ${i === beat ? styles.beatOn : ''}`}
                aria-hidden={i === beat ? undefined : 'true'}
              >
                <p className={styles.beatKey}>{b.k}</p>
                <p className={styles.beatText}>{b.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Kept out of the component body so the effect above stays readable. */
function ScrollTriggerFrom(el, progress, setBeat, setActive) {
  return gsap.to({}, {
    ease: 'none',
    scrollTrigger: {
      trigger: el,
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onToggle: (self) => setActive(self.isActive),
      onUpdate: (self) => {
        progress.current = self.progress;
        let next = 0;
        BEATS.forEach((b, i) => { if (self.progress >= b.at) next = i; });
        setBeat(next);
      },
    },
  }).scrollTrigger;
}
