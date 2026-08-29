import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { inSphere } from 'maath/random';
import * as THREE from 'three';

import { createBrilliantGeometry } from './brilliantGeometry.js';

/**
 * Seeded PRNG (mulberry32). Deterministic, so the field is pure during render
 * and — more usefully — identical on every reload: a designed composition
 * rather than a different scatter each visit.
 */
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
import { qualityTier } from './capability.js';

/**
 * Carbon becoming crystal.
 *
 * Every particle has two positions: where it starts, as loose carbon in a
 * sphere of vapour, and where it ends, ON THE SURFACE OF THE BRILLIANT. The
 * scroll progress interpolates between them, so the field does not merely
 * swirl decoratively — it condenses into the exact stone the hero shows.
 * That is the CVD process stated as motion rather than as a diagram.
 *
 * `maath`'s inSphere gives a genuinely uniform volume distribution; scattering
 * with Math.random() clumps at the centre and reads as a blob.
 */
function Field({ progress, count }) {
  const points = useRef(null);

  const { start, end } = useMemo(() => {
    const rand = makeRandom(0x9e3779b9);
    const startPos = inSphere(new Float32Array(count * 3), { radius: 3.4 });

    // Sample the brilliant's own surface for the destination positions.
    const geo = createBrilliantGeometry();
    const src = geo.getAttribute('position');
    const endPos = new Float32Array(count * 3);
    const tri = src.count / 3;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const t = Math.floor(rand() * tri) * 3;
      a.fromBufferAttribute(src, t);
      b.fromBufferAttribute(src, t + 1);
      c.fromBufferAttribute(src, t + 2);
      // Uniform point in a triangle.
      let u = rand(), v = rand();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      endPos[i * 3] = a.x + u * (b.x - a.x) + v * (c.x - a.x);
      endPos[i * 3 + 1] = a.y + u * (b.y - a.y) + v * (c.y - a.y);
      endPos[i * 3 + 2] = a.z + u * (b.z - a.z) + v * (c.z - a.z);
    }
    geo.dispose();
    return { start: startPos, end: endPos };
  }, [count]);

  const positions = useMemo(() => new Float32Array(start), [start]);

  useFrame((state) => {
    const node = points.current;
    if (!node) return;
    const p = progress.current;
    // Ease so the condensation accelerates as it completes.
    const e = p * p * (3 - 2 * p);
    const arr = node.geometry.attributes.position.array;

    for (let i = 0; i < arr.length; i += 1) {
      arr[i] = start[i] + (end[i] - start[i]) * e;
    }
    node.geometry.attributes.position.needsUpdate = true;

    node.rotation.y = state.clock.elapsedTime * 0.05 + e * 0.6;
    node.material.opacity = 0.28 + e * 0.55;
    node.material.size = 0.02 - e * 0.008;
    node.scale.setScalar(2.1 - e * 0.55);
  });

  useEffect(() => {
    const node = points.current;
    return () => {
      node?.geometry?.dispose();
      node?.material?.dispose();
    };
  }, []);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        transparent
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={new THREE.Color('#e2cfa4')}
      />
    </points>
  );
}

function Gate({ active }) {
  const { setFrameloop, invalidate } = useThree();
  useEffect(() => {
    setFrameloop(active ? 'always' : 'never');
    if (active) invalidate();
  }, [active, invalidate, setFrameloop]);
  return null;
}

export default function GenesisField({ progress, active }) {
  const tier = qualityTier();
  // The count is the whole performance story here, so it follows the tier
  // rather than being a fixed "looks nice on my machine" number.
  const count = tier === 'high' ? 4000 : 1800;

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 40 }}
      dpr={[1, tier === 'high' ? 1.6 : 1.2]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Gate active={active} />
      <Field progress={progress} count={count} />
    </Canvas>
  );
}
