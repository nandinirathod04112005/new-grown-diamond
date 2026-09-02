import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CubeCamera, MeshRefractionMaterial } from '@react-three/drei';
import * as THREE from 'three';

import { createBrilliantGeometry } from '@/lib/three/brilliantGeometry.js';
import { createStudioEnvironment } from '@/lib/three/studioEnv.js';
import { getPageProgress } from '@/lib/motion/pageProgress.js';

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Eased ramp between two scroll positions. */
function seg(p, a, b) {
  const t = THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * The stone.
 *
 * Scroll position is the playhead: every value is read from it, so scrubbing
 * back runs the shot backwards exactly. The turn, tilt, dolly and framing move
 * on different curves, so no two moments in the scroll look alike.
 *
 * On a capable device the material is a true refraction shader — light enters,
 * bounces inside the stone and leaves split into colour. That is what actually
 * distinguishes a diamond from a shiny grey solid, and no amount of
 * reflectivity on a standard material substitutes for it. Weaker devices get a
 * physical material instead: still faceted, still bright, a fraction of the
 * cost.
 */
function StoneMesh({ meshRef, geometry, high, envTexture }) {
  if (!high) {
    return (
      <mesh ref={meshRef} geometry={geometry}>
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
    // One capture, once: the environment never moves, so re-rendering the cube
    // every frame would buy nothing and cost six extra draws.
    <CubeCamera resolution={256} frames={1} envMap={envTexture}>
      {(texture) => (
        <mesh ref={meshRef} geometry={geometry}>
          <MeshRefractionMaterial
            envMap={texture}
            bounces={2}
            ior={2.42}
            fresnel={0.55}
            /* Dispersion. A real brilliant splits white light into spectral
               fire at the pavilion; without this it reads as glass. */
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

export default function Stone({ tier }) {
  const mesh = useRef(null);
  const cur = useRef(0);
  const intro = useRef(0);
  // Damped pointer influence, and the running clock for the idle motion.
  const px = useRef(0);
  const py = useRef(0);
  const t = useRef(0);
  const { invalidate } = useThree();

  const geometry = useMemo(() => createBrilliantGeometry(), []);
  const envTexture = useMemo(() => createStudioEnvironment(), []);
  const high = tier === 'high';

  // Disposed on unmount; attaching it to the scene is done declaratively
  // below rather than by mutating the object the hook handed us.
  useEffect(() => () => envTexture.dispose(), [envTexture]);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.05);
    t.current += step;

    if (intro.current < 1) {
      intro.current = Math.min(1, intro.current + step / 2.5);
      invalidate();
    }
    const ei = 1 - Math.pow(1 - intro.current, 3);

    const target = getPageProgress();
    cur.current = damp(cur.current, target, 4.5, step);
    const p = cur.current;

    // Held right of centre and large while the hero headline owns the left,
    // then walking to the middle as the page starts to move.
    const heroHold = 1 - seg(p, 0.005, 0.11);

    // The stone is alive while it is the hero and the tab is being looked at.
    // Without this the demand loop freezes it the moment scrolling stops, and
    // a motionless gem reads as a photograph rather than a live object.
    const inHero = p < 0.16;
    const awake = inHero && document.visibilityState === 'visible';

    // R3F already tracks the pointer in normalised space, so the stone can
    // lean toward the cursor without a second listener.
    px.current = damp(px.current, state.pointer.x, 3, step);
    py.current = damp(py.current, state.pointer.y, 3, step);
    const lean = awake ? 1 : 0;

    if (mesh.current) {
      const idle = awake ? t.current * 0.16 : 0;
      const breathe = awake ? Math.sin(t.current * 0.55) * 0.045 : 0;

      mesh.current.rotation.y =
        p * Math.PI * 2.15 + (1 - ei) * -1.15 + idle + px.current * 0.34 * lean;
      // Crown-down at rest, easing over to a side profile as the page moves.
      mesh.current.rotation.x =
        0.62 - seg(p, 0.15, 0.72) * 0.72 + breathe - py.current * 0.18 * lean;
      mesh.current.rotation.z = Math.sin(p * Math.PI * 1.4) * 0.06;

      const dolly = 1 + seg(p, 0.1, 0.5) * 0.34 - seg(p, 0.62, 0.95) * 0.28;
      mesh.current.scale.setScalar(dolly * (0.92 + heroHold * 0.04) * (0.82 + ei * 0.18));
      // Framed to sit fully inside the right half: at fov 34 and z 4.4 the
      // visible half-width is about 2.15 world units, so the stone's own
      // radius has to be accounted for or the girdle clips the edge.
      mesh.current.position.x = heroHold * 0.72;
      mesh.current.position.y =
        -0.12 + Math.sin(p * Math.PI) * 0.22 + (awake ? Math.sin(t.current * 0.42) * 0.035 : 0);
    }

    // Keep requesting frames while the hero is alive; otherwise only until
    // the scroll damping has caught up, so a chapter being read costs nothing.
    if (awake || Math.abs(target - cur.current) > 0.0004) invalidate();
  });

  return (
    <>
      <color attach="background" args={['#0c0c0e']} />
      {/* The physical-material path reads scene.environment; the refraction
          path takes the cube directly. Both come from the same painted
          studio, so the two tiers are lit identically. */}
      <primitive attach="environment" object={envTexture} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2.5]} intensity={2.5} />
      <directionalLight position={[-4, -1, -3]} intensity={1.4} color="#9fb6d8" />

      <StoneMesh meshRef={mesh} geometry={geometry} high={high} envTexture={envTexture} />
    </>
  );
}
