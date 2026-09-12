import { useEffect, useRef, useState } from 'react';

import film1280 from '@/assets/process/cvd-journey-1280.mp4';
import film854 from '@/assets/process/cvd-journey-854.mp4';
import poster1280 from '@/assets/process/cvd-journey-poster-1280.webp';
import poster854 from '@/assets/process/cvd-journey-poster-854.webp';
import styles from './CvdProcess.module.css';

/**
 * The CVD journey on film, in a lit window: seed plate loaded, chamber sealed,
 * plasma, the grown crystal harvested, laser, wheel, loupe, finished stone.
 *
 * SCRUBBED, NOT PLAYED. The opening of the pinned sequence is a scroll story,
 * so the film moves with the reader: it hands CvdProcess a scrubber through
 * `onScrubber`, the timeline calls it with 0..1, and the film shows that
 * moment. The encode (cvd-journey-*.mp4) has
 * a keyframe every quarter second and no B-frames, which is what makes a seek
 * land quickly anywhere; seeks are also queued, one at a time, so a fast
 * scroll asks for the latest moment rather than piling up a hundred seeks a
 * slow phone would work through for seconds after the reader stopped.
 *
 * LOADED LATE. Nothing but the 20 kB poster is fetched until the section is
 * about a screen and a half away; then the 1.6 MB phone cut or the 3.3 MB
 * desktop cut, chosen by screen width. Muted and inline, and primed with a
 * play/pause the moment it can play, because iOS will not load a video's frames
 * or honour a seek until it has been "played" once.
 *
 * `interactive` is the reduced-motion version: an ordinary player with
 * controls, fetched only if the visitor presses play, and nothing moves by
 * itself.
 *
 * Source: the process film supplied by the owner (illustrative footage, like
 * the plates — see the note under the section), trimmed to the shots without
 * burned-in captions: the opening shot and the gas-panel shot carried
 * machine-written labels with spelling errors.
 */
export default function CvdFilm({ onScrubber, interactive = false, autoplay = false }) {
  const box = useRef(null);
  const video = useRef(null);
  const [small] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches);
  /* Armed = the film's source is set. Straight away for the player, and for a
     browser with no IntersectionObserver to wait on. */
  const [armed, setArmed] = useState(() => interactive || typeof IntersectionObserver === 'undefined');
  const want = useRef(0);
  const busy = useRef(false);

  const src = small ? film854 : film1280;
  const poster = small ? poster854 : poster1280;

  /* Fetch the film only once the section is near. */
  useEffect(() => {
    if (armed || !box.current) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setArmed(true); io.disconnect(); }
    }, { rootMargin: '150% 0px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [armed]);

  /* The scrubber: one seek in flight, always towards the latest request. */
  useEffect(() => {
    if (interactive || autoplay || !armed) return undefined;
    const v = video.current;
    if (!v) return undefined;

    const pump = () => {
      if (!Number.isFinite(v.duration) || v.readyState < 1) return;
      const t = Math.min(v.duration - 0.04, Math.max(0, want.current * v.duration));
      if (Math.abs(v.currentTime - t) < 1 / 48) { busy.current = false; return; }
      busy.current = true;
      v.currentTime = t;
    };
    const seeked = () => { busy.current = false; pump(); };
    const ready = () => {
      /* iOS: a muted inline video must be played once before it will seek. */
      const primed = v.play();
      if (primed && typeof primed.then === 'function') primed.then(() => { v.pause(); pump(); }).catch(() => pump());
      else { v.pause(); pump(); }
    };

    v.addEventListener('seeked', seeked);
    v.addEventListener('loadedmetadata', ready, { once: true });
    if (v.readyState >= 1) ready();

    /* Hand the parent a scrubber: 0..1 in, that moment of the film out. */
    onScrubber?.((p) => {
      want.current = p;
      box.current?.style.setProperty('--film', p.toFixed(4));
      if (!busy.current) pump();
    });
    return () => {
      v.removeEventListener('seeked', seeked);
      v.removeEventListener('loadedmetadata', ready);
      onScrubber?.(null);
    };
  }, [armed, autoplay, interactive, onScrubber]);

  if (interactive) {
    return (
      <div ref={box} className={styles.filmStill}>
        <video src={src} poster={poster} controls muted playsInline preload="none" />
      </div>
    );
  }

  return (
    <div ref={box} className={styles.film} aria-hidden="true">
      <video
        ref={video}
        className={styles.filmVideo}
        src={armed ? src : undefined}
        poster={poster}
        muted
        playsInline
        autoPlay={autoplay}
        loop={autoplay}
        preload={armed ? 'auto' : 'none'}
        disablePictureInPicture
        tabIndex={-1}
      />
      {/* The window's light: a slow sheen, a vignette, viewfinder corners and
          the journey's progress drawn along the foot of the frame. */}
      <span className={styles.filmSheen} />
      <span className={styles.filmVignette} />
      <span className={styles.filmCorners}><i /><i /><i /><i /></span>
      <span className={styles.filmProgress} />
    </div>
  );
}
