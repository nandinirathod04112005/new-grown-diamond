import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import JewelleryCard from '@/components/product/JewelleryCard.jsx';
import Button from '@/components/primitives/Button.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import useAsyncData from '@/hooks/useAsyncData.js';
import { fetchFeaturedJewellery } from '@/lib/data/source.js';
import styles from './JewelleryPreview.module.css';

/**
 * The jewellery counterpoint — deliberately one section, editorial in tone.
 * Diamonds carry roughly three quarters of this page; this is the remainder,
 * and it earns its place by being quieter rather than louder.
 */
export default function JewelleryPreview() {
  const { data, loading, error } = useAsyncData(() => fetchFeaturedJewellery(3));

  return (
    <Section id="jewellery" tone="hairline" aria-labelledby="jewellery-title">
      <SectionHeading
        id="jewellery-title"
        eyebrow="Fine jewellery"
        lines={['Once the stone', { text: 'is right.', node: <em>is right.</em> }]}
        standfirst="A small collection, made around stones we already own. Settings in 18K gold and platinum, finished by hand."
      />

      {error && (
        <p className={styles.state} role="alert">
          The collection could not be loaded just now.
        </p>
      )}

      {loading && (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <Reveal className={styles.grid} selector={`.${styles.cell}`} stagger={0.12} y={38}>
          {data.map((piece) => (
            <div key={piece.public_id} className={styles.cell}>
              <JewelleryCard piece={piece} />
            </div>
          ))}
        </Reveal>
      )}

      <Reveal className={styles.cta} delay={0.15}>
        <Button to="/jewellery" variant="outline">Browse the collection</Button>
      </Reveal>
    </Section>
  );
}
