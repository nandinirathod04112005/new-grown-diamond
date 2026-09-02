import { Canvas } from '@react-three/fiber';

import Stone from './Stone.jsx';

/**
 * `frameloop="demand"` is the whole performance story: nothing renders unless
 * the scroll asked for it. Scrolling requests frames, damping requests a few
 * more until it settles, and then the GPU goes quiet — which is exactly how a
 * scrubbed video behaves, and why this does not drain a battery while someone
 * reads a chapter.
 */
export default function Canvas3D({ tier }) {
  const high = tier === 'high';
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;

  return (
    <Canvas
      frameloop="demand"
      dpr={mobile ? [0.75, 1.15] : high ? [1, 1.75] : 1}
      camera={{ fov: 34, position: [0, 0, 4.4] }}
      gl={{
        antialias: high,
        powerPreference: 'high-performance',
        alpha: false,
      }}
    >
      <Stone tier={tier} />
    </Canvas>
  );
}
