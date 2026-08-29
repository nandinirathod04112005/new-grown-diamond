import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import DiamondCard from '@/components/product/DiamondCard.jsx';
import Button from '@/components/primitives/Button.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import useAsyncData from '@/hooks/useAsyncData.js';
import { fetchFeaturedDiamonds } from '@/lib/data/source.js';
import styles from './FeaturedDiamonds.module.css';

export default function FeaturedDiamonds() {
  const { data, loading, error } = useAsyncData(() => fetchFeaturedDiamonds(6));

  return (
    <Section id="featured-diamonds" tone="hairline" aria-labelledby="featured-title">
      <div className={styles.head}>
        <SectionHeading
          id="featured-title"
          eyebrow="Current inventory"
          lines={['Stones worth', { text: 'the journey', node: <em>the journey</em> }]}
          standfirst="A rotating selection from our certified inventory. Every stone is graded by IGI or GIA and photographed against the same light."
        />
        <Reveal className={styles.headAction} delay={0.2}>
          <Button to="/diamonds" variant="ghost">View all diamonds</Button>
        </Reveal>
      </div>

      {error && (
        <p className={styles.state} role="alert">
          The inventory could not be loaded. Please try again shortly.
        </p>
      )}

      {loading && (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <Reveal className={styles.grid} selector={`.${styles.cell}`} stagger={0.09} y={34}>
          {data.map((stone) => (
            <div key={stone.public_id} className={styles.cell}>
              <DiamondCard stone={stone} />
            </div>
          ))}
        </Reveal>
      )}
    </Section>
  );
}
