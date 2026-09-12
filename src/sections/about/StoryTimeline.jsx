import { useEffect, useRef } from 'react';
import Reveal from '@/components/motion/Reveal.jsx';
import useReducedMotion from '@/hooks/useReducedMotion.js';
import { useCopy } from '@/i18n/useCopy.js';
import diamond from '@/assets/diamonds/ngd-brilliant-macro.webp';
import COPY from './StoryTimeline.copy.js';
import styles from './StoryEditorial.module.css';

export default function StoryTimeline({ steps }) {
  const root = useRef(null);
  const reduced = useReducedMotion();
  const c = useCopy(COPY);
  useEffect(() => {
    if (reduced) return undefined;
    const node = root.current;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const value = Math.max(0, Math.min(1, (innerHeight * .45 - box.top) / box.height));
      node.style.setProperty('--journey', value);
    };
    const update = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(paint); };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', update); removeEventListener('resize', update); node.style.removeProperty('--journey'); };
  }, [reduced]);
  return <section id="the-house" ref={root} className={styles.journey} aria-labelledby="story-heading">
    <aside className={styles.index}>
      <p className={styles.label}>{c.label}</p>
      <h2 id="story-heading">{c.title.first}<br /><em>{c.title.em}</em></h2>
      <p>{c.intro}</p>
      <nav aria-label={c.chapters}>{steps.map((step, i) => <a href={`#story-${step.key}`} key={step.key}><span>{String(i + 1).padStart(2, '0')}</span>{step.title}</a>)}</nav>
      <img className={styles.stone} src={diamond} loading="lazy" alt={c.stone} />
    </aside>
    <div className={styles.chapters}>
      <div className={styles.thread} aria-hidden="true"><span /></div>
      {steps.map((step, i) => <Reveal as="article" id={`story-${step.key}`} className={styles.chapter} key={step.key}>
        <span className={styles.number}>{String(i + 1).padStart(2, '0')}</span>
        <p className={styles.label}>{step.marker}</p>
        <h3>{step.title}</h3>
        <p className={styles.chapterBody}>{step.lines.join(' ')}</p>
        {i === steps.length - 1 && <a className={styles.link} href="/diamonds">{c.discover} <span aria-hidden="true">↗</span></a>}
      </Reveal>)}
    </div>
  </section>;
}
