import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ShapeCarousel.copy.js';
import s from './ShapeCarousel.module.css';

/**
 * The nine cuts, on a turning ring.
 *
 * The stones orbit an elliptical track seen from slightly above: the one at
 * the front is large and bright, the ones going round the back shrink and
 * fade, and every stone also turns slowly on its own, the way a diamond is
 * shown on a turntable. The ring whirls on its own, spins up further as the page
 * is scrolled past it, can be thrown by hand with momentum and settles on the
 * nearest cut when let go, and the arrows, the
 * keyboard and a click on any stone all bring a cut to the front.
 *
 * WHY 2D PROJECTION, NOT CSS 3D. Each stone's place on the ellipse is
 * computed and written as a plain translate + scale, with its stacking order
 * set from its depth. A preserve-3d ring gets the same picture but hands the
 * depth sorting to the browser, which flattens it the moment any ancestor has
 * a filter or overflow — and this page has both.
 *
 * ACCESSIBILITY. It moves by itself, so it has a visible pause control; it
 * also stops while keyboard focus is inside it, and slows under the pointer. The nine cuts
 * are a real list of links with their descriptions inside them, so a screen
 * reader gets all nine and never an announcement every few seconds; the large
 * panel under the ring is the same text again for sighted readers. Under
 * reduced motion the ring does not drift or spin, and moving it is instant.
 */

/*
 * The 400 px copies in cuts/small/, not the 800 px originals: no stone on this
 * ring is ever drawn wider than 190 px (380 device pixels on a 2x screen), and
 * the nine originals together were 1.2 MB that a phone fetched before the
 * visitor had scrolled to them. The shapes page keeps the originals.
 */
const SHOTS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/diamonds/cuts/small/*.webp', { eager: true, import: 'default' }),
  ).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase(), url]),
);
const PHONE_SHOTS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/diamonds/cuts/small/phone/*.webp', { eager: true, import: 'default' }),
  ).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase(), url]),
);

/* The cuts themselves — order, names, descriptions — are in
   ShapeCarousel.copy.js. Every language shares the English list's length, so
   the ring's geometry is fixed here once. */
const N = COPY.en.cuts.length;
const STEP = 360 / N;
/* A full turn in about 13 seconds: the ring visibly whirls, and each cut
   still holds the front for about a second and a half. */
const DRIFT = 28;
/* Each stone's own turn, degrees per second: once round every nine seconds. */
const SPIN = 40;
/* Under the pointer the ring slows to this share of its speed rather than
   stopping, so a stone can be clicked without the whole thing looking frozen. */
const HOVER_SHARE = 0.3;
/* How much a page scroll spins it up (degrees per second, per px/s scrolled),
   and the most it may add. */
const SCROLL_GAIN = 0.045;
const SCROLL_MAX = 170;

/* The shortest signed way from one angle to another, in -180..180. */
const shortest = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

export default function ShapeCarousel() {
  const stage = useRef(null);
  const nodes = useRef([]);
  const spark = useRef(null);
  const motion = useRef({
    angle: 0, vel: 0, target: null, dragging: false, moved: 0,
    lastX: 0, lastT: 0, hover: false, focus: false, visible: true, reduced: false, spin: 0, front: 0,
    speed: 0, boost: 0,
  });
  const [front, setFront] = useState(0);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(true);
  const c = useCopy(COPY);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  /* Bring cut i to the front by the short way round. */
  const goTo = useCallback((i) => {
    const m = motion.current;
    const to = m.angle + shortest(i * STEP - m.angle);
    m.vel = 0;
    if (m.reduced) {
      m.angle = to;
      m.target = null;
    } else {
      m.target = to;
    }
  }, []);

  const step = useCallback((dir) => goTo((motion.current.front + dir + N) % N), [goTo]);

  /* ---------------- the frame loop ---------------- */
  useEffect(() => {
    const m = motion.current;
    m.reduced = prefersReducedMotion();
    const el = stage.current;
    let raf = 0;
    let last = performance.now();
    /* The stage's width, read when it changes rather than on every frame:
       reading it inside the loop forced a layout sixty times a second for as
       long as the home page was open, scrolled to or not. */
    let w = el.clientWidth;
    const sized = new ResizeObserver(() => { w = el.clientWidth; });
    sized.observe(el);

    const layout = () => {
      /* A tighter ring on a phone keeps the side stones on screen. */
      const rx = Math.min(w * (w < 600 ? 0.35 : 0.41), 540);
      /* Deeper on a phone: nine stones on a narrow ring need the height to
         separate front from back, or they read as one heap. */
      const ry = Math.min(w * (w < 600 ? 0.13 : 0.085), 70);
      el.style.setProperty('--rx', `${rx}px`);
      el.style.setProperty('--ry', `${ry}px`);
      let best = 0;
      let bestC = -2;
      for (let i = 0; i < N; i += 1) {
        const node = nodes.current[i];
        if (!node) continue;
        const th = ((i * STEP - m.angle) * Math.PI) / 180;
        const c = Math.cos(th);
        const d = (c + 1) / 2;
        node.style.transform = `translate3d(${(Math.sin(th) * rx).toFixed(1)}px, ${(c * ry).toFixed(1)}px, 0) scale(${(0.4 + 0.8 * d).toFixed(3)})`;
        node.style.zIndex = String(Math.round(d * 100));
        node.style.setProperty('--d', d.toFixed(3));
        if (c > bestC) { bestC = c; best = i; }
      }
      /* A point of light running round the track, faster than the ring. */
      if (spark.current) {
        const a = ((m.spin * 2.4) * Math.PI) / 180;
        spark.current.style.transform = `translate3d(${(Math.sin(a) * rx).toFixed(1)}px, ${(Math.cos(a) * ry).toFixed(1)}px, 0)`;
        spark.current.style.opacity = String((0.35 + 0.65 * ((Math.cos(a) + 1) / 2)).toFixed(2));
      }
      return best;
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      /* Off screen and at rest, there is nothing to draw: skip the nine
         transforms instead of rewriting them unseen on every frame. */
      if (!m.visible && !m.dragging && m.target === null && Math.abs(m.vel) <= 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!m.dragging) {
        if (m.target !== null) {
          const diff = m.target - m.angle;
          m.angle += diff * Math.min(1, dt * 6.5);
          if (Math.abs(diff) < 0.04) { m.angle = m.target; m.target = null; }
        } else if (Math.abs(m.vel) > 1) {
          /* The throw carries on and dies away, then settles on a cut. */
          m.angle += m.vel * dt;
          m.vel *= Math.pow(0.06, dt);
          if (Math.abs(m.vel) <= 1) {
            m.vel = 0;
            m.target = Math.round(m.angle / STEP) * STEP;
          }
        } else {
          m.angle += m.speed * dt;
        }
      }

      /*
       * The speed eases toward where it should be rather than jumping, so the
       * ring spins up, slows under the pointer and coasts to a stop on Pause
       * the way a real turntable does. Keyboard focus and Pause stop it
       * outright; hover only slows it; a page scroll spins it up.
       */
      const free = !m.reduced && m.visible && playingRef.current && !m.focus;
      const want = free ? (m.hover ? DRIFT * HOVER_SHARE : DRIFT) + m.boost : 0;
      m.speed += (want - m.speed) * Math.min(1, dt * 3.2);
      m.boost *= Math.pow(0.18, dt);

      if (!m.reduced && m.visible) {
        m.spin = (m.spin + (SPIN + m.boost * 0.6) * dt) % 360;
        el.style.setProperty('--spin', `${m.spin.toFixed(2)}deg`);
      }
      const best = layout();
      if (best !== m.front) {
        m.front = best;
        setFront(best);
      }
      raf = requestAnimationFrame(tick);
    };

    layout();
    raf = requestAnimationFrame(tick);

    /* Off screen, the ring stops drifting and spinning: nobody is watching. */
    const io = new IntersectionObserver(([entry]) => { m.visible = entry.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);

    /* Scrolling past it winds it up: the faster the page moves, the faster the
       ring whirls, then it coasts back to its own speed. */
    let lastY = window.scrollY;
    let lastS = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const pxPerSec = (Math.abs(window.scrollY - lastY) / Math.max(16, now - lastS)) * 1000;
      lastY = window.scrollY;
      lastS = now;
      if (m.visible && !m.reduced) m.boost = Math.min(SCROLL_MAX, m.boost + pxPerSec * SCROLL_GAIN);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      sized.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  /* ---------------- throwing it by hand ---------------- */
  function onPointerDown(e) {
    if (e.button !== 0) return;
    const m = motion.current;
    m.dragging = true;
    m.moved = 0;
    m.lastX = e.clientX;
    m.lastT = performance.now();
    m.target = null;
    m.vel = 0;
  }

  function onPointerMove(e) {
    const m = motion.current;
    if (!m.dragging) return;
    const dx = e.clientX - m.lastX;
    const now = performance.now();
    const rx = parseFloat(stage.current.style.getPropertyValue('--rx')) || 400;
    /* A drag across the front of the ring moves the stones under the pointer. */
    const deg = (dx / (Math.PI * rx)) * 180;
    m.angle -= deg;
    m.moved += Math.abs(dx);
    if (m.moved > 6 && !stage.current.hasPointerCapture?.(e.pointerId)) {
      stage.current.setPointerCapture?.(e.pointerId);
    }
    const dtMs = Math.max(1, now - m.lastT);
    m.vel = (-deg / dtMs) * 1000 * 0.6 + m.vel * 0.4;
    m.lastX = e.clientX;
    m.lastT = now;
  }

  function onPointerUp(e) {
    const m = motion.current;
    if (!m.dragging) return;
    m.dragging = false;
    stage.current.releasePointerCapture?.(e.pointerId);
    if (m.reduced || Math.abs(m.vel) <= 1) {
      m.vel = 0;
      goTo(((Math.round(m.angle / STEP) % N) + N) % N);
    }
  }

  /* A stone that is not at the front comes to the front; the front stone is a
     link to the shapes page. A drag that ends over a stone is not a click. */
  function onStoneClick(e, i) {
    if (motion.current.moved > 6) {
      e.preventDefault();
      return;
    }
    if (i !== motion.current.front) {
      e.preventDefault();
      goTo(i);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  }

  /* Rendered from `front` on every render, never from inside the frame loop,
     so the caption follows a change of language as well as a turn. */
  const { id, name, desc: text } = c.cuts[front];

  return (
    <div
      className={s.carousel}
      data-motion="off"
      onPointerEnter={() => { motion.current.hover = true; }}
      onPointerLeave={() => { motion.current.hover = false; }}
      onFocus={() => { motion.current.focus = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) motion.current.focus = false; }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={stage}
        className={s.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className={s.track} aria-hidden="true" />
        <span className={s.trackOuter} aria-hidden="true" />
        <span ref={spark} className={s.spark} aria-hidden="true" />

        <ul className={s.ring} aria-label={c.ringLabel}>
          {c.cuts.map((cut, i) => (
            <li
              key={cut.id}
              ref={(el) => { nodes.current[i] = el; }}
              className={s.item}
              data-front={i === front ? '' : undefined}
              style={{ '--o': `${i * 37}deg` }}
            >
              <a
                href="/shapes"
                className={s.stone}
                draggable="false"
                onClick={(e) => onStoneClick(e, i)}
                onFocus={() => goTo(i)}
              >
                <span className={s.floor} aria-hidden="true" />
                <picture>
                  <source media="(max-width: 767px)" srcSet={PHONE_SHOTS[cut.id.toLowerCase()]} />
                  <img
                    src={SHOTS[cut.id.toLowerCase()]}
                    alt=""
                    width="400"
                    height="400"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                </picture>
                <span className={s.glint} aria-hidden="true" />
                <span className={s.vh}>{interpolate(c.stoneLabel, { name: cut.name, desc: cut.desc })}</span>
              </a>
            </li>
          ))}
        </ul>

        <p className={s.hint} aria-hidden="true">{c.hint}</p>
      </div>

      {/* The same text as the list above, large, for the stone at the front. */}
      <div className={s.panel}>
        <button type="button" className={s.arrow} onClick={() => step(-1)} aria-label={c.previous}>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>

        <div className={s.caption} aria-hidden="true">
          <p className={s.count}>
            <b>{String(front + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}
          </p>
          <div key={id} className={s.swap}>
            <h3 className={s.name}>{name}</h3>
            <p className={s.desc}>{text}</p>
          </div>
        </div>

        <button type="button" className={s.arrow} onClick={() => step(1)} aria-label={c.next}>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={s.foot}>
        <a className={s.explore} href="/shapes">
          {interpolate(c.explore, { name: name.toLowerCase() })} <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <button
          type="button"
          className={s.pause}
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={!playing}
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? c.pause : c.play}
        </button>
      </div>
    </div>
  );
}
