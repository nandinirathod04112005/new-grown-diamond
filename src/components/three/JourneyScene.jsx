import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { inSphere } from 'maath/random';
import * as THREE from 'three';

import { createBrilliantGeometry, createRoughPositions } from './brilliantGeometry.js';
import { qualityTier } from './capability.js';
import { HANDOFF, ramp, makeRandom } from '@/lib/journey.js';

/**
 * THE JOURNEY SCENE — carbon, plasma, growth, rough. Nothing polished.
 *
 * One `progress` ref drives everything. There is no timeline and no state:
 * every frame derives the entire scene from the scroll position, so scrubbing
 * backwards is exact and a resize cannot desynchronise two animations from
 * each other.
 *
 * WHAT THIS SCENE MAY DEPICT is a product rule, not an artistic one.
 * Generated geometry shows ROUGH crystal only — genuinely blocky, stepped and
 * opaque, where nobody is being shown a gem. At HANDOFF the director crossfades
 * to a photograph of a real company-owned stone, and this scene fades out
 * beneath it. No bloom, dispersion or post-processing is applied to anything
 * standing in for a real diamond: an effect that changes a stone's appearance
 * misrepresents the goods.
 */

/**
 * The carbon field: loose gas, then plasma, then atoms settling onto the
 * crystal. Destinations are sampled from the crystal's own vertices, so the
 * field does not merely swirl — it condenses into the thing being grown.
 */
function CarbonField({ progress, count, surface }) {
  const points = useRef(null);
  const material = useRef(null);

  const start = useMemo(
    () => inSphere(new Float32Array(count * 3), { radius: 2.9 }),
    [count]
  );
  const positions = useMemo(() => new Float32Array(start), [start]);

  // A stable per-particle jitter, so atoms do not all arrive on the same path.
  const phase = useMemo(() => {
    const rnd = makeRandom(0x5eed);
    return Float32Array.from({ length: count }, () => rnd());
  }, [count]);

  useFrame((state) => {
    const node = points.current;
    if (!node) return;
    const p = progress.current;
    const t = state.clock.elapsedTime;

    const plasma = ramp(p, 0.15, 0.36);
    const settle = ramp(p, 0.34, 0.6);
    const retire = ramp(p, 0.56, HANDOFF.from);

    // Per-frame writes go through the live geometry on the mesh ref, never a
    // memoised binding — a stale reference here silently animates an object
    // that is no longer the one being drawn.
    const attr = node.geometry.attributes.position;
    const arr = attr.array;

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const ph = phase[i];

      // Gas: a slow drift. Plasma: the drift becomes agitation.
      const heat = 0.02 + plasma * 0.26;
      const wob = Math.sin(t * (0.6 + ph) + ph * 12.6) * heat;

      const sx = start[i3] + wob;
      const sy = start[i3 + 1] + Math.cos(t * (0.5 + ph) + ph * 9.4) * heat;
      const sz = start[i3 + 2] + wob * 0.7;

      // Destination: a vertex of the crystal being grown.
      const d3 = (i % (surface.length / 3)) * 3;
      const k = settle * (0.55 + ph * 0.45);

      arr[i3] = sx + (surface[d3] - sx) * k;
      arr[i3 + 1] = sy + (surface[d3 + 1] - sy) * k;
      arr[i3 + 2] = sz + (surface[d3 + 2] - sz) * k;
    }
    attr.needsUpdate = true;

    if (material.current) {
      // Cool grey gas warms as it ionises, then recedes as the solid takes it.
      material.current.color.setRGB(
        0.42 + plasma * 0.48,
        0.44 + plasma * 0.3,
        0.5 + plasma * 0.06
      );
      material.current.opacity = (0.16 + plasma * 0.5) * (1 - retire);
      material.current.size = 0.012 + plasma * 0.012;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * The rough crystal. Blocky and opaque on purpose — this is what comes out of
 * the chamber, and it is the only diamond form generated geometry is allowed
 * to depict. A standard material, deliberately: no transmission, no
 * dispersion, nothing that would let this read as a finished gem.
 */
function Crystal({ progress, rough }) {
  const mesh = useRef(null);
  const material = useRef(null);

  useFrame((state) => {
    const node = mesh.current;
    if (!node) return;
    const p = progress.current;

    const grow = ramp(p, 0.3, 0.58);
    const fade = ramp(p, HANDOFF.from, HANDOFF.to);

    node.scale.setScalar(0.05 + grow * 0.72);
    node.rotation.y = state.clock.elapsedTime * 0.08 + p * 1.1;

    if (material.current) {
      material.current.opacity = grow * (1 - fade);
      // Cloudy and grey while growing; it never becomes clear, because the
      // real photograph takes over before anything is polished.
      material.current.roughness = 0.62 - grow * 0.14;
    }

  });

  /**
   * The slab is built once, not lerped every frame.
   *
   * This used to interpolate every vertex toward the rough form on each tick
   * and then call computeVertexNormals() — recomputing the normals of the
   * whole mesh sixty times a second to produce a shape that never changed.
   * The crystal only ever grows in SCALE, so the geometry is static.
   */
  const geometry = useMemo(() => {
    const g = createBrilliantGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(rough, 3));
    g.computeVertexNormals();
    return g;
  }, [rough]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial
        ref={material}
        transparent
        opacity={0}
        color="#cfd4d8"
        roughness={0.6}
        metalness={0.04}
        flatShading
      />
    </mesh>
  );
}

/** Caps the device pixel ratio and releases the context on unmount. */
function Housekeeping({ active }) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  }, [gl]);

  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  useEffect(() => () => {
    // Three does not release the WebGL context on its own; without this a few
    // navigations exhaust the browser's context limit and every canvas on the
    // page goes black.
    gl.dispose();
    gl.forceContextLoss?.();
  }, [gl]);

  return null;
}

export default function JourneyScene({ progress, active }) {
  const tier = useMemo(() => qualityTier(), []);
  const count = tier === 'high' ? 2600 : 1100;

  // Both position sets come from one geometry so they share vertex ordering.
  // The carbon field's destinations are the crystal's own vertices, so the
  // particles condense into the exact thing being grown rather than merely
  // swirling near it.
  const { rough, surface } = useMemo(() => {
    const g = createBrilliantGeometry();
    const r = createRoughPositions(g);
    g.dispose();
    return { rough: r, surface: r };
  }, []);

  return (
    <Canvas
      className="ngd-scene-canvas"
      // Never rendered on demand while scrubbing would look stepped; never
      // rendered at all while the stage is off-screen or the tab is hidden.
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Housekeeping active={active} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#9fb4c8" />
      <CarbonField progress={progress} count={count} surface={surface} />
      <Crystal progress={progress} rough={rough} />
    </Canvas>
  );
}
