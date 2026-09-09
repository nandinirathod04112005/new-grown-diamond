import { Children, cloneElement, useEffect, useRef, useState } from 'react';

import useReducedMotion from '@/hooks/useReducedMotion.js';
import Reveal from './Reveal.jsx';
import Magnetic from './Magnetic.jsx';
import styles from './MotionPrimitives.module.css';

export const MotionReveal = Reveal;
export const MagneticButton = Magnetic;

export function SplitTextReveal({ children, as: Tag = 'span', className = '' }) {
  const words = String(children).split(/(\s+)/);
  let index = 0;
  return (
    <Tag className={`${styles.split} ${className}`} aria-label={String(children)}>
      {words.map((word, key) => word.trim() ? (
        <span aria-hidden="true" className={styles.word} style={{ '--word-index': index++ }} key={key}>{word}</span>
      ) : <span aria-hidden="true" key={key}>{word}</span>)}
    </Tag>
  );
}

export function StaggerGroup({ children, as: Tag = 'div', className = '' }) {
  return (
    <Tag className={`${styles.stagger} ${className}`}>
      {Children.map(children, (child, index) => child && cloneElement(child, {
        style: { ...child.props.style, '--stagger-index': index },
      }))}
    </Tag>
  );
}

export function ImageMaskReveal({ children, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const node = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);
  return <div ref={ref} className={`${styles.mask} ${className}`} data-visible={visible || reduced}>{children}</div>;
}

export function ParallaxMedia({ children, strength = 36, className = '' }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const node = ref.current;
    let frame = 0;
    let offset = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!visible) return;
      const box = node.getBoundingClientRect();
      // Subtract our own translation so parallax cannot feed back into itself.
      const progress = (box.top - offset + box.height / 2 - innerHeight / 2) / innerHeight;
      offset = -Math.max(-1, Math.min(1, progress)) * strength;
      node.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`);
    };
    const scroll = () => { if (visible && !frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      scroll();
    }, { rootMargin: '100px' });
    observer.observe(node);
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', scroll, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener('scroll', scroll);
      removeEventListener('resize', scroll);
      cancelAnimationFrame(frame);
      node.style.removeProperty('--parallax-y');
    };
  }, [reduced, strength]);
  return <div ref={ref} className={`${styles.parallax} ${className}`}>{children}</div>;
}
