import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CubeCamera, MeshRefractionMaterial } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';

import { createBrilliantGeometry } from '@/lib/three/brilliantGeometry.js';
import { createStudioEnvironment } from '@/lib/three/studioEnv.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * A stone the visitor can turn.
 *
 * The photograph in the database is a single fixed angle, and a diamond's
 * whole character is how it changes as it moves — so the 360 view is the real
 * geometry rather than a frame sequence. That also means it works for every
 * stone in the table without anyone having to shoot 120 frames per stone.
 *
 * Rotation is inertial: the stone keeps turning after the pointer is released
 * and eases to rest, which is how a real stone behaves in the hand and is what
 * separates this from a slider bound to an axis.
 */
function Gem({ spin, transparent, scale = 1.25, edges = false }) {
  const mesh = useRef(null);
  const rim = useRef(null);
  const { invalidate } = useThree();
  const geometry = useMemo(() => createBrilliantGeometry(), []);
  /*
   * Facet edges.
   *
   * Chasing photorealism with a refraction shader is a losing fight at this
   * size — it lands in the uncanny middle where it is clearly not a photograph
   * but is trying to be one. The reference poster does not attempt it either:
   * its diamond is a deliberately GRAPHIC crystal with bright facet edges
   * drawn into the technical linework. Committing to that register is both
   * more honest and better looking than a near-miss at realism.
   *
   * 1 degree, so coplanar triangles inside one facet are not outlined — only
   * the real facet boundaries are.
   */
  const edgeGeometry = useMemo(
    () => (edges ? new THREE.EdgesGeometry(geometry, 1) : null),
    [geometry, edges],
  );
  const envTexture = useMemo(() => createStudioEnvironment(), []);

  /* Three.js animation state intentionally lives in refs and is mutated per
     frame; routing it through React state would render the tree at 60 fps. */
  /* oxlint-disable react/immutability */
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    const s = spin.current;

    // Idle drift so a stone nobody has touched is still alive — but never
    // under reduced motion, where the stone must be perfectly still until the
    // visitor takes hold of it. Momentum from their own drag still decays
    // naturally: that is their motion, not ours.
    if (!s.dragging) {
      s.vx *= Math.pow(0.94, step * 60);
      s.vy *= Math.pow(0.94, step * 60);
      s.y += (s.vx + (s.calm ? 0 : 0.12)) * step;
      s.x += s.vy * step;
    } else {
      s.y += s.vx * step;
      s.x += s.vy * step;
    }

    // Clamped so a drag can never park it edge-on, where the stone reads as a
    // sliver of shards rather than as a diamond.
    s.x = THREE.MathUtils.clamp(s.x, 0.22, 1.05);

    if (mesh.current) {
      mesh.current.rotation.y = s.y;
      mesh.current.rotation.x = s.x;
    }
    if (rim.current) {
      rim.current.rotation.y = s.y;
      rim.current.rotation.x = s.x;
    }
    invalidate();
  });
  /* oxlint-enable react/immutability */

  return (
    <>
      {!transparent && <color attach="background" args={['#0b0b0d']} />}
      <primitive attach="environment" object={envTexture} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 2.5]} intensity={3} />
      <directionalLight position={[-3, -1, -3]} intensity={1.6} color="#9fb6d8" />

      <CubeCamera resolution={512} frames={1} envMap={envTexture}>
        {(texture) => (
          <mesh ref={mesh} geometry={geometry} scale={scale}>
            <MeshRefractionMaterial
              envMap={texture}
              bounces={3}
              ior={2.42}
              fresnel={0.28}
              /* Dispersion is real, but it belongs in small flashes at facet
                 junctions, not as saturated red and green bands across the
                 table. At 0.035 it read as a novelty prism; even 0.012 still
                 banded. A trace is all a white stone under studio light
                 actually shows. */
              aberrationStrength={0.004}
              color="#ffffff"
              fastChroma
              toneMapped={false}
            />
          </mesh>
        )}
      </CubeCamera>

      {edgeGeometry ? (
        <lineSegments ref={rim} geometry={edgeGeometry} scale={scale * 1.001}>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.42}
            toneMapped={false}
            depthWrite={false}
          />
        </lineSegments>
      ) : null}

      {/*
        Bloom is what makes a rendered stone read as a real one. A diamond's
        bright facet returns are far brighter than the surrounding scene, and a
        real camera blooms them; without it every facet clips flat at white and
        the gem looks like painted plastic.

        The threshold is high on purpose — only genuine specular hits bloom,
        not the whole stone, which is the difference between fire and haze.
      */}
      <EffectComposer disableNormalPass>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.28}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function Stone360({ transparent = false, tilt = 0.25, scale = 1.25, edges = false }) {
  /*
   * `tilt` is the initial elevation in radians, and it matters more than it
   * looks. A round brilliant viewed from near the girdle plane is a thin wide
   * sliver — geometrically correct and visually broken. The classic three
   * quarter view that reads instantly as "diamond" needs roughly 35-40 degrees
   * of elevation, which is what the hero passes.
   */
  const spin = useRef({ x: tilt, y: 0, vx: 0, vy: 0, dragging: false, calm: prefersReducedMotion() });
  const last = useRef({ x: 0, y: 0 });

  function down(e) {
    spin.current.dragging = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function move(e) {
    if (!spin.current.dragging) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    // Velocity, not position: releasing mid-drag then carries the throw.
    spin.current.vx = dx * 0.22;
    spin.current.vy = dy * 0.12;
  }

  function up(e) {
    spin.current.dragging = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.6]}
      camera={{ fov: 34, position: [0, 0, 4.2] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: transparent }}
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
    >
      <Gem spin={spin} transparent={transparent} scale={scale} edges={edges} />
    </Canvas>
  );
}
