import { useEffect, useState } from 'react';

import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import styles from './ChapterRail.module.css';

/**
 * A fixed chapter index down the right edge — the reader's position in the
 * narrative, and a way to jump between chapters.
 *
 * Real <button>s in a <nav>, so it is operable by keyboard rather than being
 * decorative scroll furniture. Hidden below 1100px, where it would crowd the
 * content rather than orient the reader.
 */
const CHAPTERS = [
  { id: 'genesis', n: '01', label: 'Genesis' },
  { id: 'precision', n: '02', label: 'Precision' },
  { id: 'inventory', n: '03', label: 'Inventory' },
  { id: 'manufacture', n: '04', label: 'Manufacture' },
  { id: 'atelier', n: '05', label: 'Atelier' },
  { id: 'assurance', n: '06', label: 'Assurance' },
  { id: 'ascent', n: '07', label: 'Brilliance' },
];

export default function ChapterRail() {
  const { scrollTo } = useSmoothScroll();
  const [active, setActive] = useState('');

  useEffect(() => {
    const sections = CHAPTERS
      .map((c) => document.getElementById(c.id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      // A band across the middle of the viewport: whichever chapter occupies
      // it is the one being read.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={styles.rail} aria-label="Chapters">
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`${styles.mark} ${active === c.id ? styles.on : ''}`}
              onClick={() => scrollTo(`#${c.id}`)}
              aria-current={active === c.id ? 'true' : undefined}
            >
              <span className={styles.n}>{c.n}</span>
              <span className={styles.label}>{c.label}</span>
              <span className={styles.tick} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
