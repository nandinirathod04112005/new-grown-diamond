import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './Preloader.module.css';

const shouldSkip = () => prefersReducedMotion() || window.matchMedia?.('(max-width:767px)').matches || navigator.connection?.saveData || ['slow-2g','2g'].includes(navigator.connection?.effectiveType);

export default function FastPreloader({ onDone }) {
  const [gone, setGone] = useState(shouldSkip);
  const notified = useRef(false);
  useEffect(() => {
    if (gone) {
      if (!notified.current) { notified.current = true; onDone?.(); }
      return undefined;
    }
    const finish = () => setGone(true);
    const timer = window.setTimeout(finish, 720);
    window.addEventListener('pointerdown', finish, { once:true, passive:true });
    window.addEventListener('keydown', finish, { once:true });
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', finish); window.removeEventListener('keydown', finish); };
  }, [gone, onDone]);
  if (gone) return null;
  return <div className={styles.fastRoot} role="status" aria-label="Loading"><span>New Grown Diamond</span><i/><button type="button" onClick={() => setGone(true)}>Skip</button></div>;
}
