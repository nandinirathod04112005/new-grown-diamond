import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
/* The real stone does both jobs now: it is what each particle IS, and its
   silhouette is the shape they gather into. One photograph, so the swarm and
   the subject are the same diamond rather than two different ones. */
import gem from '@/assets/diamonds/ngd-brilliant-cutout.webp';
import shapeSrc from '@/assets/diamonds/ngd-brilliant-cutout.webp';
import styles from './DiamondField.module.css';

/**
 * Hundreds of small diamonds that spell the house, then become one stone.
 *
 * WHAT IT DOES. On arrival the stones fly in from the dark and settle into the
 * letters N G D. As the page is scrolled they leave the letters and gather
 * into the outline of a single brilliant, and the light on them turns from
 * white to violet as they go. Scroll back and the word reassembles.
 *
 * HOW THE TWO SHAPES ARE FOUND. Both are rasterised once, into the same grid:
 * the word is drawn with the site's own display face and read back, and the
 * gem's silhouette is read from the alpha of the traced stone. Every particle
 * is handed one point in each set, so the morph is a straight interpolation
 * between two positions rather than a simulation — which is why it can be
 * scrubbed backwards and forwards by the scroll without ever drifting.
 *
 * WHY CANVAS. Four hundred elements is impossible in the DOM. One canvas, one
 * decoded sprite and four hundred drawImage calls is a few tenths of a
 * millisecond a frame, and it costs one composited layer.
 *
 * WHAT IT COSTS WHEN IT CANNOT RUN. Nothing at all. It is decorative and
 * aria-hidden, it draws nothing under reduced motion, and if the sprite never
 * decodes the canvas simply stays empty. No content depends on it.
 */

const COUNT = 780;
const WORD = 'NGD';

export default function DiamondField({ progressRef, className = '' }) {
  const canvas = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) return undefined;

    const ctx = el.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let particles = [];
    let raf = 0;
    let start = 0;
    let visible = false;
    let alive = true;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const sprite = new Image();
    const shape = new Image();
    let ready = 0;

    /* Read a drawing back as a list of points on a grid. */
    const sample = (draw, cols, rows, w, h) => {
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return [];
      draw(octx, cols, rows);
      let data;
      try {
        data = octx.getImageData(0, 0, cols, rows).data;
      } catch {
        return [];
      }
      const points = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (data[(y * cols + x) * 4 + 3] > 128) {
            points.push([(x / cols) * w, (y / rows) * h]);
          }
        }
      }
      return points;
    };

    const build = () => {
      const rect = el.parentElement.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;

      const cols = 190;
      const rows = Math.max(30, Math.round((height / width) * cols));

      /*
       * WHERE THE MARK SITS, and it took a wrong answer to find it.
       *
       * WHERE A BIG MARK CAN ACTUALLY GO.
       *
       * Behind the composition, the opaque case swallowed the G and the D and
       * the site spelled "N" and half a letter. Moved in front and blown up to
       * two thirds of the stage it hit the opposite problem: the stones are
       * screen-blended, so over the brightly lit diamond they added nothing to
       * something already near white and the D disappeared again.
       *
       * The band below the case is dark across the full width, which is where
       * light-on-dark letters read. So the mark sits there, in front, at
       * getting on for half the stage — large, unobstructed, and legible for
       * the same reason the headline is.
       */
      const MARK_Y = 0.90;
      const MARK_W = 0.46;

      const word = sample((c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#fff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        let size = Math.round(h * 0.20);
        c.font = `300 ${size}px "Cormorant Garamond", Georgia, serif`;
        while (c.measureText(WORD).width > w * MARK_W && size > 6) {
          size -= 1;
          c.font = `300 ${size}px "Cormorant Garamond", Georgia, serif`;
        }
        c.letterSpacing = `${Math.max(1, Math.round(size * 0.08))}px`;
        c.fillText(WORD, w / 2, h * MARK_Y);
      }, cols, rows, width, height);

      /*
       * The stone gathers where the word stood, so the change is a
       * transformation rather than a journey across the screen. Large enough
       * to be resolved: sampled small, the silhouette came back as two dozen
       * grid cells and five hundred stones piled into it as a lump.
       */
      const stone = sample((c, w, h) => {
        c.clearRect(0, 0, w, h);
        /*
         * Sampled from the photograph's own alpha. Large enough to be
         * resolved: sampled small, the silhouette came back as two dozen grid
         * cells and five hundred stones piled into it as a lump.
         */
        /* The cut-out is trimmed to the stone already, so the whole file is
           the silhouette and there is nothing to crop away. */
        const SX = 0;
        const SY = 0;
        const SW = 1;
        const SH = 1;
        const boxW = Math.min(w * 0.34, h * 0.9);
        const boxH = boxW * (SH / SW);
        c.drawImage(
          shape,
          shape.naturalWidth * SX, shape.naturalHeight * SY,
          shape.naturalWidth * SW, shape.naturalHeight * SH,
          (w - boxW) / 2, h * MARK_Y - boxH * 0.5, boxW, boxH,
        );
      }, cols, rows, width, height);

      if (!word.length || !stone.length) return;

      /*
       * Spread evenly across the shape rather than by a stride that can land
       * repeatedly on the same cells. A prime stride was leaving some strokes
       * of the letters thin while others doubled up, which is what made the
       * mark read as a smudge instead of as N G D.
       */
      const pick = (list, i, n) => list[Math.floor((i / n) * list.length) % list.length];
      particles = Array.from({ length: COUNT }, (_, i) => {
        const a = pick(word, i, COUNT);
        const b = pick(stone, i, COUNT);
        const angle = (i / COUNT) * Math.PI * 2;
        return {
          ax: a[0], ay: a[1],
          bx: b[0], by: b[1],
          /* where it flies in from */
          sx: width / 2 + Math.cos(angle) * width * 0.75,
          sy: height / 2 + Math.sin(angle) * height * 0.9,
          size: 5 + ((i * 37) % 8),
          spin: ((i * 53) % 360) * (Math.PI / 180),
          rate: 0.4 + ((i * 17) % 60) / 100,
        };
      });
    };

    const draw = (entrance, morph, time) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!particles.length || entrance <= 0) return;

      const e = entrance * entrance * (3 - 2 * entrance);
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        /* the target is the word, the stone, or somewhere between */
        const tx = p.ax + (p.bx - p.ax) * morph;
        const ty = p.ay + (p.by - p.ay) * morph;
        /* and the entrance carries it in from the dark */
        const x = p.sx + (tx - p.sx) * e;
        const y = p.sy + (ty - p.sy) * e;

        const s = p.size * (0.5 + e * 0.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.spin + time * 0.00018 * p.rate);
        ctx.globalAlpha = 0.42 + e * 0.55;
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }

      /* The wash that turns the swarm violet as it becomes a stone. */
      if (morph > 0.01) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(158, 112, 255, ${0.66 * morph})`;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const tick = (now) => {
      raf = 0;
      if (!alive) return;
      if (!start) start = now;

      const entrance = Math.min(1, (now - start) / 2000);
      const holder = progressRef?.current;
      const hp = holder ? parseFloat(holder.style.getPropertyValue('--hp')) || 0 : 0;
      /*
       * The word holds briefly, then becomes the stone — and it has to finish
       * EARLY. Mapped across half the hero's travel the change completed at
       * 56 per cent, by which point the hero has largely left the screen and
       * nobody saw the stone at all. Finishing by a third of the way means the
       * whole morph happens while the hero is still most of the view.
       */
      const morph = Math.min(1, Math.max(0, (hp - 0.03) / 0.28));

      draw(entrance, morph, now);
      if (visible) raf = requestAnimationFrame(tick);
    };

    const begin = () => {
      if (!alive) return;
      build();
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    /* Both images have to be decoded before the shapes can be sampled. */
    const onReady = () => { ready += 1; if (ready >= 2) begin(); };
    sprite.decoding = 'async';
    shape.decoding = 'async';
    sprite.src = gem;
    shape.src = shapeSrc;
    if (sprite.complete) onReady(); else sprite.addEventListener('load', onReady, { once: true });
    if (shape.complete) onReady(); else shape.addEventListener('load', onReady, { once: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf && particles.length) raf = requestAnimationFrame(tick);
        if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
      },
      { rootMargin: '10% 0px' },
    );
    io.observe(el);

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { if (sprite.complete && shape.complete) build(); });
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      io.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      sprite.removeEventListener('load', onReady);
      shape.removeEventListener('load', onReady);
    };
  }, [progressRef]);

  return <canvas ref={canvas} className={`${styles.field} ${className}`.trim()} aria-hidden="true" />;
}
