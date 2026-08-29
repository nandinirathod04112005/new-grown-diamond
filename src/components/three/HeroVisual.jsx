import { Suspense, lazy, useEffect, useState } from 'react';

import { qualityTier } from './capability.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './HeroVisual.module.css';

// three + drei + postprocessing live in their own chunk, never in the bundle
// that renders the headline.
const DiamondScene = lazy(() => import('./DiamondScene.jsx'));

/**
 * The real photograph renders immediately and always. WebGL is decided after
 * mount and cross-fades in over it only where it is welcome, so the headline
 * and navigation never wait on a canvas.
 *
 * ONLY the high tier gets the canvas. Without dispersion, bloom and
 * antialiasing — all of which the low tier drops — the render reads as flat
 * plaster, and a photograph of a real NGD stone is unambiguously the better
 * image. The 3D has to beat the photograph to earn the screen, not merely
 * to be possible.
 *
 * Once a frame has genuinely been drawn the photograph fades out, rather than
 * sitting behind the canvas where two stones would overlap.
 */
export default function HeroVisual({ photoRef }) {
  const [use3D, setUse3D] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setUse3D(qualityTier() === 'high'));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={styles.visual}>
      <div className={`${styles.photo} ${sceneReady ? styles.photoOut : ''}`}>
        <img
          ref={photoRef}
          src={stoneUrl}
          alt="A New Grown Diamond round brilliant, photographed against black"
          width={754}
          height={541}
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {use3D && (
        <Suspense fallback={null}>
          <div className={styles.canvas}>
            <DiamondScene onReady={() => setSceneReady(true)} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
