import diamond from '@/assets/diamonds/ngd-brilliant-macro.webp';
import PageHero from '@/components/layout/PageHero.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import styles from './JewelleryPage.module.css';

const STEPS = [
  ['01', 'Select', 'Choose a shape, carat range and quality target.'],
  ['02', 'Inspect', 'Review available stones, videos and certificates.'],
  ['03', 'Design', 'Develop the setting around the selected diamond.'],
  ['04', 'Make', 'Approve the direction and move into production.'],
];

export default function JewelleryPage() {
  return (
    <main className={styles.page}>
      <PageHero
        eyebrow="Custom jewellery / Made around the stone"
        title="The diamond leads. The setting follows."
        intro="Every mount is built around its stone, never the reverse. Real jewellery photography will appear only when an approved NGD asset is supplied."
        accent="#c9a24a"
        motif="rings"
        action={{ href: '/contact', label: 'Begin a custom enquiry' }}
      />

      <section className={styles.process}>
        <p className="u-eyebrow">The custom process</p>
        {STEPS.map((item, index) => (
          <Reveal as="article" key={item[0]} delay={index * 90}>
            <span>{item[0]}</span><h2>{item[1]}</h2><p>{item[2]}</p>
          </Reveal>
        ))}
      </section>

      <Reveal as="section" className={styles.close}>
        <img
          src={diamond}
          alt="A real New Grown Diamond round brilliant photographed loose against black"
          width="754"
          height="541"
          loading="lazy"
          decoding="async"
        />
        <div>
          <p className="u-eyebrow">Loose stone first</p>
          <h2>Start with what can be verified.</h2>
          <p>Our team can help identify a diamond, provide inspection material and discuss a custom setting for it.</p>
          <a href="/diamonds">Explore diamond programmes →</a>
        </div>
      </Reveal>
    </main>
  );
}
