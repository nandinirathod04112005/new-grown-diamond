import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './DotMatrix.module.css';

/**
 * A photograph that assembles itself out of dots, and comes apart again.
 *
 * WHAT IT IS. The image is sampled once into a grid of cells. Each cell
 * becomes one dot whose radius is its own brightness, and which travels from a
 * scattered start position to its place in the grid. At progress 0 the dots
 * are dispersed and dim; at 1 they sit exactly on the grid and the frame reads
 * as the photograph. The real <img> cross-fades in over the last stretch, so
 * the finished state is the actual picture at full detail rather than an
 * approximation of it — the dots are the arrival, not the destination.
 *
 * WHY CANVAS AND NOT WEBGL. Nine thousand elements is impossible in the DOM
 * and unnecessary in a shader. One 2D canvas, one path, one fill per frame
 * draws the whole matrix; the cost is a single composite. Nothing here loads a
 * graphics library.
 *
 * WHAT DRIVES IT. Two numbers multiplied:
 *
 *   entrance   0 -> 1 once, on arrival, over ~1.6s
 *   scroll     read from --hp on `progressRef`, so the frame comes apart as
 *              the hero leaves and reassembles if the visitor scrolls back
 *
 * useHeroProgress writes --hp as an inline style, so reading it is a property
 * lookup rather than a full style resolution — cheap enough to do per frame.
 *
 * WHAT IT COSTS WHEN IT CANNOT RUN. Nothing. The canvas is decorative and
 * aria-hidden; the real photograph sits underneath it and is what assistive
 * technology, search engines and a visitor with reduced motion get. If the
 * canvas never initialises, the image is simply already there.
 */

/* Cell size in CSS pixels. Smaller reads finer and costs more dots; 7 keeps a
   1000px-wide frame near 9,000 dots, which draws in one path comfortably. */
const CELL = 7;

export default function DotMatrix({ src, progressRef, className = '', tint = '218, 205, 178' }) {
  const canvas = useRef(null);
  const wrap = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return undefined;
    if (prefersReducedMotion()) return undefined;

    const ctx = el.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let cells = [];
    let raf = 0;
    let start = 0;
    let visible = false;
    let alive = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    /* Sample the image into cells: one dot each, carrying its brightness and
       the scattered position it travels from. */
    const build = (image) => {
      const rect = box.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;

      const cols = Math.max(2, Math.floor(width / CELL));
      const rows = Math.max(2, Math.floor(height / CELL));

      /* Read the image at grid resolution rather than full size: this is the
         only time the pixels are touched. */
      const sampler = document.createElement('canvas');
      sampler.width = cols;
      sampler.height = rows;
      const sctx = sampler.getContext('2d', { willReadFrequently: true });
      if (!sctx) return;

      /* cover, matching the CSS object-fit of the photograph underneath. */
      const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight);
      const dw = image.naturalWidth * scale;
      const dh = image.naturalHeight * scale;
      sctx.drawImage(image, (cols - dw) * 0.57, (rows - dh) / 2, dw, dh);

      let data;
      try {
        data = sctx.getImageData(0, 0, cols, rows).data;
      } catch {
        return; /* A tainted canvas: leave the photograph as it is. */
      }

      const next = [];
      const cw = width / cols;
      const ch = height / rows;

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const i = (y * cols + x) * 4;
          /* Perceived brightness, and the alpha the source had. */
          const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
          const a = data[i + 3] / 255;
          const value = lum * a;
          /* The black field is most of this photograph; skipping it is what
             keeps the dot count and the fill rate down. */
          if (value < 0.06) continue;

          const tx = x * cw + cw / 2;
          const ty = y * ch + ch / 2;
          /* Scattered from the centre outward, so the matrix gathers inward
             rather than sliding in from one side. */
          const angle = Math.atan2(ty - height / 2, tx - width / 2);
          const spread = 90 + value * 130;
          next.push({
            tx,
            ty,
            /* start position */
            sx: tx + Math.cos(angle) * spread,
            sy: ty + Math.sin(angle) * spread,
            v: value,
          });
        }
      }
      cells = next;
    };

    const draw = (p) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!cells.length || p <= 0) return;

      /* One path for every dot, one fill for the lot. */
      ctx.beginPath();
      const eased = p * p * (3 - 2 * p);
      for (let i = 0; i < cells.length; i += 1) {
        const c = cells[i];
        const x = c.sx + (c.tx - c.sx) * eased;
        const y = c.sy + (c.ty - c.sy) * eased;
        const r = (CELL / 2) * c.v * (0.35 + eased * 0.65);
        if (r < 0.12) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(${tint}, ${0.28 + eased * 0.62})`;
      ctx.fill();
    };

    const tick = (now) => {
      raf = 0;
      if (!alive) return;
      if (!start) start = now;

      /* entrance: 0 -> 1 over 1.6s, once. */
      const entrance = Math.min(1, (now - start) / 1600);

      /* scroll: the frame comes apart again as the hero leaves. */
      const holder = progressRef?.current;
      const hp = holder ? parseFloat(holder.style.getPropertyValue('--hp')) || 0 : 0;
      const leaving = Math.min(1, hp / 0.55);

      const p = entrance * (1 - leaving);
      draw(p);

      /* The photograph beneath takes over as the dots finish gathering. */
      box.style.setProperty('--formed', (entrance * (1 - leaving)).toFixed(3));

      const settled = entrance >= 1 && (leaving <= 0 || leaving >= 1);
      if (visible && !settled) raf = requestAnimationFrame(tick);
      else if (visible && entrance >= 1) {
        /* Still watch for scroll changes, but only while on screen. */
        raf = requestAnimationFrame(tick);
      }
    };

    const image = new Image();
    image.decoding = 'async';
    image.src = src;

    const begin = () => {
      if (!alive) return;
      build(image);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    if (image.complete) begin();
    else image.addEventListener('load', begin, { once: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
        if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: '20% 0px' },
    );
    io.observe(box);

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (image.complete) build(image);
      });
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      io.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      image.removeEventListener('load', begin);
    };
  }, [src, progressRef, tint]);

  return (
    <span ref={wrap} className={`${styles.wrap} ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvas} className={styles.canvas} />
    </span>
  );
}
