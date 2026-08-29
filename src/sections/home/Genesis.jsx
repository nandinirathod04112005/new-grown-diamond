import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { supports3D } from '@/components/three/capability.js';
import { STAGES, ramp } from '@/lib/genesisStages.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './Genesis.module.css';

const GenesisScene = lazy(() => import('@/components/three/GenesisScene.jsx'));

/**
 * Chapter 01 — DIAMOND GENESIS.
 *
 * The centrepiece: one pinned, scroll-controlled transformation from gas to a
 * stone in the vault, in six stages. The pin earns itself because the scroll
 * IS the growth — nothing here is decorative motion over static content.
 *
 * Scroll drives a single `progress` ref, which the WebGL scene reads every
 * frame. React state holds only the caption index, so scrubbing does not
 * re-render the tree sixty times a second.
 *
 * Below the desktop breakpoint, and wherever WebGL is refused, the same six
 * stages are told as a plain vertical sequence ending on the real photograph.
 * That is a different telling, not a broken one.
 */
export default function Genesis() {
  const scope = useRef(null);
  const progress = useRef(0);
  const track = useRef(null);
  const handoff = useRef(null);
  const [stage, setStage] = useState(0);
  const [use3D, setUse3D] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setUse3D(supports3D()));
    return () => cancelAnimationFrame(id);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const st = ScrollTrigger.create({
          trigger: scope.current,
          start: 'top top',
          // Long enough that six stages each get real scroll distance; short
          // enough that nobody feels trapped.
          end: '+=460%',
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => setActive(self.isActive),
          onUpdate: (self) => {
            progress.current = self.progress;
            let next = 0;
            STAGES.forEach((s, i) => { if (self.progress >= s.at) next = i; });
            setStage(next);
            if (track.current) {
              track.current.style.transform = `scaleY(${self.progress})`;
            }
            // The polished stone is ALWAYS the real photograph. The rough
            // crystal hands over as cutting begins, so from the Precision
            // stage onward the diamond on screen is a photograph of an actual
            // NGD stone, never a render of one.
            // Written straight to style: this runs on every scrub frame and
            // must not re-render the tree.
            if (handoff.current) {
              handoff.current.style.opacity = String(ramp(self.progress, 0.7, 0.84));
            }
          },
        });
        return () => st.kill();
      });

      // Small screens and reduced motion: the scene rests on its finished
      // state and every caption is readable as prose.
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
              <GenesisScene progress={progress} active={active} />
              <img
                ref={handoff}
                className={styles.handoff}
                src={stoneUrl}
                alt="The finished New Grown Diamond round brilliant, graded and in the vault"
                width={754}
                height={541}
                loading="lazy"
                decoding="async"
              />
            </Suspense>
          ) : (
            /* No WebGL: the real stone stands in for the finished state, and
               the lattice wash carries the earlier stages. No canvas, no cost. */
            <div className={styles.fallback}>
              <span className={styles.lattice} aria-hidden="true" />
              <img
                src={stoneUrl}
                alt="A New Grown Diamond round brilliant, the finished result of the process described"
                width={754}
                height={541}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>

        <div className={`ngd-page ngd-grid ${styles.inner}`}>
          <p className={`ngd-tech ${styles.chapter}`}>Chapter 01 — Diamond Genesis</p>

          <SplitReveal as="h2" id="genesis-title" className={styles.title}>
            Gas becomes stone, slowly.
          </SplitReveal>

          {/* Desktop: one caption at a time, cross-fading with the scene. */}
          <div className={styles.beats}>
            {STAGES.map((s, i) => (
              <article
                key={s.key}
                className={`${styles.beat} ${i === stage ? styles.beatOn : ''}`}
                aria-hidden={i === stage ? undefined : 'true'}
              >
                <p className={styles.beatIndex}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.beatRule} aria-hidden="true" />
                  <span className={styles.beatKey}>{s.key}</span>
                </p>
                <p className={styles.beatText}>{s.blurb}</p>
              </article>
            ))}
          </div>

          {/* Stage index, doubling as the scrub position. */}
          <ol className={styles.ladder} aria-hidden="true">
            <li className={styles.ladderTrack}>
              <span ref={track} className={styles.ladderFill} />
            </li>
            {STAGES.map((s, i) => (
              <li key={s.key} className={i <= stage ? styles.ladderOn : ''}>
                {s.key}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
