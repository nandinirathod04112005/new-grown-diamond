import Eyebrow from '@/components/primitives/Eyebrow.jsx';
import SplitLines from '@/components/motion/SplitLines.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import styles from './SectionHeading.module.css';

/**
 * The heading block every section shares: eyebrow, masked display heading,
 * optional standfirst. Keeps hierarchy identical down the page.
 */
export default function SectionHeading({
  eyebrow,
  lines,
  standfirst,
  align = 'left',
  id,
  size = 'lg',
}) {
  return (
    <header className={`${styles.head} ${styles[align]}`}>
      {eyebrow && (
        <Reveal className={styles.eyebrowWrap}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <SplitLines
        lines={lines}
        as="h2"
        id={id}
        className={`${styles.title} ${styles[size]}`}
      />
      {standfirst && (
        <Reveal delay={0.15}>
          <p className={styles.standfirst}>{standfirst}</p>
        </Reveal>
      )}
    </header>
  );
}
