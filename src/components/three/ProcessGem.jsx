import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CubeCamera, MeshRefractionMaterial } from '@react-three/drei';

import { createBrilliantGeometry } from '@/lib/three/brilliantGeometry.js';
import { createStudioEnvironment } from '@/lib/three/studioEnv.js';

/**
 * The stone that opens the CVD production sequence.
 *
 * A sibling of Stone.jsx rather than a fork of it. That one is the hero's
 * stone: it reads GLOBAL page progress and carries hero-specific framing —
 * held right of centre while the headline owns the left, walking to the middle
 * as the page moves. Bending it to also serve a pinned section halfway down a
 * different page would have meant threading two incompatible playheads through
 * one component. The genuinely reusable parts — the brilliant geometry, the
 * studio environment, the material tiers — are imported, so the two stones are
 * the same object cut the same way, lit the same way.
 *
 * The playhead here is a REF, not state. The sequence writes to it sixty times
 * a second from a scrubbed timeline, and a re-render per frame would cost more
 * than the scene it is driving.
 *
 *   progress 0    turning at full speed
 *   progress 1    stopped dead, camera pushed in, brilliance lifted
 *
 * The turn is integrated rather than assigned: `angle += speed * dt` means the
 * stone decelerates from wherever it happens to be. Setting rotation directly
 * from progress would snap it back to a fixed angle the moment scrolling began,
 * which is the one thing the brief rules out.
 */

const TURN = 0.42;

function Gem({ progressRef, tier, onSettle }) {
  const mesh = useRef(null);
  const angle = useRef(0);
  const lit = useRef(0);
  const { invalidate } = useThree();
  const high = tier === 'high';

  const geometry = useMemo(() => createBrilliantGeometry(), []);
  const envTexture = useMemo(() => createStudioEnvironment(), []);

  useEffect(() => () => {
    envTexture.dispose();
    geometry.dispose();
  }, [envTexture, geometry]);

  useFrame((state, dt) => {
    /* The camera is read from the frame state rather than captured from
       useThree: r3f may hand out a different one between renders, and taking
       it per frame is both correct and what the linter is asking for. */
    const { camera } = state;
    const step = Math.min(dt, 0.05);
    const p = progressRef.current;

    /*
     * Speed falls away on a curve, not a straight line: a linear ramp reads as
     * braking, and the brief asks for the turn to ease off rather than stop.
     * Cubed means most of the deceleration happens late, so the stone is still
     * visibly alive through the middle of the scroll.
     */
    const speed = TURN * (1 - p) ** 3;
    angle.current += speed * step;
    if (mesh.current) {
      mesh.current.rotation.y = angle.current;
      /*
       * A base tilt, so the stone is never seen edge-on.
       *
       * Turning on Y alone held it exactly at the girdle line for the whole
       * revolution, and a brilliant viewed dead side-on is a flat lozenge — it
       * stops reading as a diamond at all. The tilt is NEGATIVE: this geometry
       * is built table-up, and a positive rotation about X swings the table
       * away and shows the pavilion from underneath, which is darker still
       * because the light is coming from above it. Negative brings the crown
       * over toward the camera — the three-quarter view a stone is shown in.
       * The last of the tilt arrives with the deceleration, so the stone
       * settles INTO its best angle rather than stopping on whichever one the
       * scroll happened to leave it at.
       */
      mesh.current.rotation.x = -0.34 - p * 0.14 + Math.sin(angle.current * 0.4) * 0.06;
    }

    // The push. Small — four tenths of a unit — because a big dolly on a
    // faceted object reads as a zoom rather than a camera move.
    camera.position.z = 4.4 - 0.55 * p;
    camera.updateProjectionMatrix();

    lit.current = p;
    onSettle?.(p);

    // `frameloop="demand"` means nothing renders unless asked. Keep asking
    // while the stone still has movement left in it, then let the GPU idle.
    if (speed > 0.0015 || p < 1) invalidate();
  });

  if (!high) {
    return (
      <mesh ref={mesh} geometry={geometry}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0.02}
          ior={2.42}
          reflectivity={1}
          envMapIntensity={6.5}
          clearcoat={1}
          clearcoatRoughness={0}
          iridescence={0.35}
          iridescenceIOR={1.9}
          flatShading
        />
      </mesh>
    );
  }

  return (
    <CubeCamera resolution={256} frames={1} envMap={envTexture}>
      {(texture) => (
        <mesh ref={mesh} geometry={geometry}>
          <MeshRefractionMaterial
            envMap={texture}
            bounces={2}
            ior={2.42}
            fresnel={0.55}
            aberrationStrength={0.02}
            color="#ffffff"
            fastChroma
            toneMapped={false}
          />
        </mesh>
      )}
    </CubeCamera>
  );
}

export default function ProcessGem({ progressRef, tier }) {
  const high = tier === 'high';
  const coarse = typeof window !== 'undefined'
    && window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <Canvas
      frameloop="demand"
      dpr={coarse ? [0.75, 1.15] : high ? [1, 1.75] : 1}
      camera={{ fov: 34, position: [0, 0, 4.4] }}
      gl={{ antialias: high, powerPreference: 'high-performance', alpha: true }}
    >
      <Gem progressRef={progressRef} tier={tier} />
    </Canvas>
  );
}
