import { Suspense, lazy, useEffect, useState } from 'react';

import { supports3D } from './capability.js';
import DiamondStill from './DiamondStill.jsx';
import styles from './HeroVisual.module.css';

// Split into its own chunk: three + R3F + drei must never sit in the bundle
// that renders the hero text.
const DiamondScene = lazy(() => import('./DiamondScene.jsx'));

/**
 * The static stone renders immediately and always. WebGL is decided after
 * mount and cross-fades in over the top only where it is welcome, so hero copy
 * and navigation never wait on it.
 *
 * Once the canvas is up the still fades out rather than sitting behind it —
 * two stones layered on top of each other reads as a rendering fault.
 */
export default function HeroVisual() {
  const [use3D, setUse3D] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    // Deferred a frame so the capability probe never blocks first paint.
    const id = requestAnimationFrame(() => setUse3D(supports3D()));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={styles.visual}>
      <div className={`${styles.still} ${sceneReady ? styles.stillHidden : ''}`}>
        <DiamondStill />
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
