import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { inSphere } from 'maath/random';
import * as THREE from 'three';

import { createBrilliantGeometry, createRoughPositions } from './brilliantGeometry.js';
import { qualityTier } from './capability.js';
import { ramp, makeRandom } from '@/lib/genesisStages.js';

/**
 * DIAMOND GENESIS — one continuous scroll-driven transformation.
 *
 *   carbon → CVD plasma → crystal growth → rough → precision cut → inventory
 *
 * A single `progress` ref (0→1), scrubbed by ScrollTrigger, drives everything.
 * There is no timeline and no state: every frame reads the scroll position and
 * derives the whole scene from it, so scrubbing backwards is exact and a
 * resize cannot desynchronise two animations from each other.
 */

/**
 * The carbon field: loose gas, then plasma, then atoms settling onto the
 * crystal surface. Destinations are sampled from the brilliant's own geometry,
 * so the field does not merely swirl — it condenses into the actual stone.
 */
function CarbonField({ progress, count, surface }) {
  const points = useRef(null);

  const start = useMemo(
    () => inSphere(new Float32Array(count * 3), { radius: 2.6 }),
    [count]
  );
  const positions = useMemo(() => new Float32Array(start), [start]);
  const material = useRef(null);

  useFrame((state) => {
    const node = points.current;
    if (!node) return;
    const p = progress.current;

    const plasma = ramp(p, 0.16, 0.38);   // energy rises
    const settle = ramp(p, 0.34, 0.60);   // atoms find the lattice
    const retire = ramp(p, 0.56, 0.70);   // the solid takes over

    const arr = node.geometry.attributes.position.array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      // Turbulence peaks during plasma and dies as the lattice takes hold.
      const heat = plasma * (1 - settle) * 0.55;
      const wob = heat * Math.sin(t * 1.7 + i * 0.35);

      for (let a = 0; a < 3; a += 1) {
        const from = start[i3 + a];
        const to = surface[i3 + a];
        arr[i3 + a] = from + (to - from) * settle + wob * (a === 1 ? 0.6 : 1);
      }
    }
    node.geometry.attributes.position.needsUpdate = true;

    node.rotation.y = t * 0.05 + settle * 0.5;
    node.scale.setScalar(1.5 - settle * 0.62);

    const m = material.current;
    if (m) {
      m.opacity = (0.38 + plasma * 0.55) * (1 - retire);
      m.size = 0.028 + plasma * 0.026 - settle * 0.014;
      // Cold carbon → hot plasma → settling gold.
      m.color.setRGB(
        0.42 + plasma * 0.58,
        0.38 + plasma * 0.34 - settle * 0.06,
        0.34 + plasma * 0.1
      );
    }
  });

  useEffect(() => {
    const node = points.current;
    return () => {
      node?.geometry?.dispose();
      node?.material?.dispose();
    };
  }, []);

  return (
    <points ref={points} position={[0, -0.55, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        transparent
        size={0.016}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * The ROUGH crystal, and only the rough.
 *
 * This mesh never becomes a polished diamond. A finished stone on this site is
 * always a photograph of a real one — generated geometry cannot carry real
 * facets, inclusions, transparency or proportions, and rendering a fake
 * brilliant here would undercut the very claim the chapter is making.
 *
 * Rough diamond is the one form generated geometry can depict honestly: it is
 * genuinely blocky, stepped and opaque, and nobody is being shown a gem. As
 * the cut begins, this recedes and the real photograph takes over — which is
 * exactly what happens in the facility.
 */
function Crystal({ progress, cutGeometry, roughPositions }) {
  const mesh = useRef(null);
  const material = useRef(null);

  // Built once for the mesh to own. The frame loop below never touches this
  // binding — it reaches the geometry through the mesh ref, i.e. the live
  // scene object, which is both what R3F expects and what keeps per-frame
  // buffer writes out of React's value model.
  const geometry = useMemo(() => {
    const g = cutGeometry.clone();
    g.setAttribute('position', new THREE.Float32BufferAttribute(roughPositions.slice(), 3));
    return g;
  }, [cutGeometry, roughPositions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const node = mesh.current;
    const m = material.current;
    if (!node || !m) return;
    const p = progress.current;

    const emerge = ramp(p, 0.54, 0.66);
    // The rough hands over to the photograph as cutting begins. From here on
    // the finished stone on screen is a real one.
    const handover = ramp(p, 0.7, 0.82);

    node.visible = emerge > 0.001 && handover < 0.999;
    if (!node.visible) return;

    node.rotation.y += delta * 0.2;
    node.rotation.x = -0.3 + (1 - emerge) * 0.35;
    node.scale.setScalar(0.62 + emerge * 0.28);

    m.opacity = emerge * (1 - handover);
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[0, -0.75, 0]} visible={false}>
      {/* Opaque and matte, because that is what as-grown rough looks like.
          No transmission, no dispersion, no bloom: nothing here is pretending
          to be a polished gem. */}
      <meshStandardMaterial
        ref={material}
        transparent
        flatShading
        metalness={0.05}
        roughness={0.66}
        color={new THREE.Color('#8d857a')}
      />
    </mesh>
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

function Reclaim() {
  const { gl, scene } = useThree();
  useEffect(() => () => {
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        Object.values(m).forEach((v) => v?.isTexture && v.dispose());
        m.dispose();
      });
    });
    gl.dispose();
  }, [gl, scene]);
  return null;
}

export default function GenesisScene({ progress, active }) {
  const tier = useMemo(() => qualityTier(), []);
  const count = tier === 'high' ? 5200 : 2200;

  // Built once and shared: the field's destinations are literally the
  // crystal's own surface.
  const { cutGeometry, roughPositions, surface } = useMemo(() => {
    const geo = createBrilliantGeometry();
    const rough = createRoughPositions(geo);

    const src = geo.getAttribute('position');
    const surf = new Float32Array(count * 3);
    const tri = src.count / 3;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const rand = makeRandom(0x2f6e2b1);
    for (let i = 0; i < count; i += 1) {
      const t = Math.floor(rand() * tri) * 3;
      a.fromBufferAttribute(src, t);
      b.fromBufferAttribute(src, t + 1);
      c.fromBufferAttribute(src, t + 2);
      let u = rand(), v = rand();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      surf[i * 3] = a.x + u * (b.x - a.x) + v * (c.x - a.x);
      surf[i * 3 + 1] = a.y + u * (b.y - a.y) + v * (c.y - a.y);
      surf[i * 3 + 2] = a.z + u * (b.z - a.z) + v * (c.z - a.z);
    }
    return { cutGeometry: geo, roughPositions: rough, surface: surf };
  }, [count]);

  useEffect(() => () => cutGeometry.dispose(), [cutGeometry]);

  return (
    <Canvas
      camera={{ position: [0, 0.25, 7.2], fov: 32 }}
      dpr={[1, tier === 'high' ? 1.6 : 1.2]}
      gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Gate active={active} />
      <Reclaim />

      <ambientLight intensity={0.05} />

      {/* Narrow bright bars separated by darkness: adjacent facets return very
          different values, which is what the eye reads as fire. Built in-engine
          — a drei preset would fetch a multi-megabyte HDR. */}
      <Environment resolution={tier === 'high' ? 256 : 128} background={false}>
        <color attach="background" args={['#000000']} />
        <Lightformer intensity={20} position={[0, 4, 2]} scale={[8, 0.2, 1]} color="#ffffff" />
        <Lightformer intensity={14} position={[-3.4, 1, 3]} scale={[0.2, 5, 1]} color="#fff4e0" />
        <Lightformer intensity={11} position={[3.4, -1.4, 2]} scale={[0.2, 4, 1]} color="#ffe6bd" />
        <Lightformer intensity={9} position={[1.4, 2.4, -4]} scale={[4, 0.16, 1]} color="#c9a86a" />
      </Environment>

      <CarbonField progress={progress} count={count} surface={surface} />
      <Crystal
        progress={progress}
        cutGeometry={cutGeometry}
        roughPositions={roughPositions}
      />
    </Canvas>
  );
}
