import { useRef } from 'react';

import Button from '@/components/primitives/Button.jsx';
import Eyebrow from '@/components/primitives/Eyebrow.jsx';
import SplitLines from '@/components/motion/SplitLines.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import Parallax from '@/components/motion/Parallax.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './EnquiryCTA.module.css';

/** Closing invitation. The only section that fills the viewport with light. */
export default function EnquiryCTA() {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        gsap.fromTo(
          `.${styles.aura}`,
          { scale: 0.85, opacity: 0.4 },
          {
            scale: 1.1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom',
              end: 'center center',
              scrub: 1,
            },
          }
        );
      });
      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} className={styles.cta} aria-labelledby="cta-title">
      <div className={styles.aura} aria-hidden="true" />
      <Parallax amount={30} className={styles.inner}>
        <div className="ngd-container-narrow">
          <Reveal className={styles.eyebrow}>
            <Eyebrow as="p">Speak to us</Eyebrow>
          </Reveal>

          <SplitLines
            as="h2"
            id="cta-title"
            className={styles.title}
            lines={[
              'Tell us what',
              { text: 'you are looking for.', node: <em>you are looking for.</em> },
            ]}
          />

          <Reveal delay={0.15}>
            <p className={styles.copy}>
              Send us a shape, a carat range and a budget. We will come back
              with what we actually have — usually the same day, always with
              the certificate attached.
            </p>
          </Reveal>

          <Reveal className={styles.actions} delay={0.25} selector="a" stagger={0.1}>
            <Button to="/contact" variant="solid" size="lg" magnetic>
              Start an enquiry
            </Button>
            <Button href="tel:+917339220840" variant="outline" size="lg">
              +91 73392 20840
            </Button>
          </Reveal>

          <Reveal delay={0.3}>
            <p className={styles.note}>
              Trade and retail enquiries both welcome · Surat, Gujarat, India
            </p>
          </Reveal>
        </div>
      </Parallax>
    </section>
  );
}
