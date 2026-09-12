import { Suspense, lazy, useState } from 'react';

import WebGLFallback from '@/components/three/WebGLFallback.jsx';
import { supportsInteractiveGem } from '@/lib/three/capability.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Stone360Stage.copy.js';
import styles from './StoneViews.module.css';

/*
 * Loaded only when someone opens the 360° view. Three.js and its refraction
 * shader are the heaviest code on the site; the inventory page should not pay
 * for them until a buyer asks to turn a stone.
 */
const Stone360 = lazy(() => import('@/components/three/Stone360.jsx'));

/**
 * Turn the stone.
 *
 * WHAT THIS IS, SAID PLAINLY. The inventory holds one photograph per stone,
 * not a spin video, so this is the house's 3D model of a round brilliant —
 * real brilliant geometry with a refraction shader, dragged by hand with
 * momentum. It is only offered for round stones, because that is the only
 * model there is, and the caption says it is a model and not a recording of
 * this stone. A buyer comparing light return between stones should be looking
 * at photographs and videos from the desk, and the caption points there.
 *
 * Devices that would render it badly (software GPU, two cores, 2 GB of memory)
 * get a short note instead of a stuttering scene, and a WebGL failure at any
 * point falls back to the same note rather than a blank square.
 */
export default function Stone360Stage() {
  const [capable] = useState(supportsInteractiveGem);
  const [touched, setTouched] = useState(false);
  const c = useCopy(COPY);

  const note = (
    <div className={styles.spinOff}>
      <p>{c.unsupported}</p>
      <p>{c.askVideo}</p>
    </div>
  );

  if (!capable) return note;

  return (
    <figure className={styles.spin} onPointerDown={() => setTouched(true)}>
      <WebGLFallback fallback={note}>
        <Suspense fallback={<span className={styles.spinLoading}>{c.loading}</span>}>
          <Stone360 edges tilt={0.55} scale={1.02} />
        </Suspense>
      </WebGLFallback>
      {!touched && (
        <span className={styles.dragHint} aria-hidden="true">
          <svg viewBox="0 0 40 40" width="40" height="40" focusable="false">
            <rect x="12" y="6" width="16" height="26" rx="8" />
            <line x1="20" y1="10" x2="20" y2="16" />
            <path d="M6 19 L2 22 L6 25" />
            <path d="M34 19 L38 22 L34 25" />
          </svg>
          {c.drag}
        </span>
      )}
      <figcaption>
        {c.caption}
      </figcaption>
    </figure>
  );
}
