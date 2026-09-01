import { useRef } from 'react';
import { Link } from 'react-router-dom';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import Magnetic from '@/components/motion/Magnetic.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './Ascent.module.css';

/**
 * BRILLIANCE — carbon to brilliance, completed.
 *
 * The one place the page leaves black. As this section is scrubbed through,
 * the ground lifts from carbon to warm white and the type inverts with it, so
 * the journey the copy describes is the journey the viewer physically makes.
 * It is the payoff for seven chapters of darkness, and it only works because
 * nothing before it has done the same trick.
 */
export default function Ascent() {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 70%',
            end: 'center center',
            scrub: 1,
          },
        });
        tl.to(scope.current, { '--dawn': 1, ease: 'none' })
          .fromTo(`.${styles.glow}`, { scale: 0.55, opacity: 0.25 }, {
            scale: 1.15, opacity: 1, ease: 'none', immediateRender: false,
          }, 0)
          .fromTo(`.${styles.title}`, { letterSpacing: '-0.04em', scale: 0.88 }, {
            letterSpacing: '-0.015em', scale: 1, ease: 'none', immediateRender: false,
          }, 0);
        return () => { tl.scrollTrigger?.kill(); tl.kill(); };
      });

      // Reduced motion: land on the lit state immediately rather than
      // stranding the section mid-transition.
      mm.add(MQ.still, () => { gsap.set(scope.current, { '--dawn': 1 }); });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} id="ascent" className={styles.ascent} data-chapter="07" aria-labelledby="ascent-title">
      <div className={styles.glow} aria-hidden="true" />
      <span className={styles.sunline} aria-hidden="true" />

      <div className={`ngd-page ${styles.inner}`}>
        <p className={`${styles.chapter}`}>Brilliance</p>

        <SplitReveal as="h2" id="ascent-title" className={styles.title}>
          Tell us what you are looking for.
        </SplitReveal>

        <Reveal className={styles.copy} delay={0.1}>
          <p>
            A shape, a carat range, a budget. We will come back with what we
            actually hold — usually the same day, always with the certificate
            attached.
          </p>
        </Reveal>

        <Reveal className={styles.actions} delay={0.2} selector="a" stagger={0.09}>
          <Magnetic>
            <Link to="/contact" className={styles.primary} data-cursor="Enquire">
              Start an enquiry
            </Link>
          </Magnetic>
          <Magnetic>
            <Link to="/diamond-finder" className={styles.secondary}>
              Use the diamond finder
            </Link>
          </Magnetic>
        </Reveal>

        <Reveal className={styles.meta} delay={0.3}>
          <p>
            <a href="tel:+917339220840">+91 73392 20840</a>
            <span aria-hidden="true"> · </span>
            Trade and retail · Surat, Gujarat, India
          </p>
        </Reveal>
      </div>
    </section>
  );
}
